/*
 * Copyright 2023 Fraunhofer IEE
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Contributors:
 *       Michel Otto - initial implementation
 *
 */

import {ArtifactView, DSCConnector, RouteDesc, Rule} from 'dsc-lib';
import {
  Artifact,
  b64encode,
  ConnectorController,
  DatabaseType,
  Endpoint,
  Offer,
  UsagePolicy,
} from 'dssim-core';
import {UsageRuleMapper} from '../util/UsageRuleMapper.js';
import {
  getIdFromURL,
  getSelfRefId,
  ObjectWithSelfReference,
} from '../util/util.js';

export class DSCController implements ConnectorController {
  public connectorApi: DSCConnector;
  private httpRouteId?: string;
  constructor(
    private hostname: string,
    private username: string,
    private password: string,
    private endpoints: Endpoint[]
  ) {
    this.connectorApi = new DSCConnector(
      `https://${hostname}`,
      username,
      password
    );
  }
  initialize(): Promise<void> {
    // nothing yet
    return Promise.resolve();
  }

  async transferArtifactsForAgreement(
    contractAgreementId: string
  ): Promise<void> {
    if (!this.httpRouteId) {
      throw new Error(
        'No route has been defined yet. Use downloadArtifact method or setup route with setHttpDataReceiver before calling this method.'
      );
    } else {
      const agreementArtifacts = await this.getArtifactsForAgreement(
        contractAgreementId
      );
      await this.downloadArtifact(agreementArtifacts[0].url, true, [
        this.httpRouteId!,
      ]);
    }
  }

  getDescription(endPointUrl: string) {
    return this.connectorApi.messagingService.sendIdsDescription(
      `${endPointUrl}${this.endpoints[0].path}`
    );
  }

  async createValueArtifact(
    artifact: Artifact,
    value: string
  ): Promise<string> {
    return Promise.resolve(
      getSelfRefId(
        await this.connectorApi.artifactsService.createArtifact({
          title: artifact.name,
          description: artifact.description,
          value: value,
        })
      )
    );
  }

  private getDatabaseDriverName(database: DatabaseType) {
    switch (database) {
      case 'Postgres':
        return 'org.postgresql.Driver';
      case 'Oracle':
        return 'oracle.jdbc.OracleDriver';
      default:
        throw new Error(`Database Type ${database} not supported`);
    }
  }

  private async createCustomCamelRoute(
    artifactId: string,
    url: string,
    delay: number,
    period: number,
    mimeType: string,
    basicAuth?: {username: string; password: string}
  ) {
    const contents = `<routes xmlns="http://camel.apache.org/schema/spring">
        <route id="my-custom-route">
          <from uri="timer://foo?delay=${delay}&amp;period=${period}"/>
  
          <setHeader name="CamelHttpMethod"><constant>GET</constant></setHeader>
          <setHeader name="Authorization"><constant>Basic ${b64encode(
            `${basicAuth?.username}:${basicAuth?.password}`
          )}</constant></setHeader>
          <setHeader name="Accept"><constant>${mimeType}</constant></setHeader>
  
          <toD uri="${url}" />
  
          <setHeader name="CamelHttpMethod"><constant>PUT</constant></setHeader>
          <setHeader name="Authorization">
                <constant>Basic Basic ${b64encode(
                  `${this.username}:${this.password}`
                )}</constant>
          </setHeader>
          <setHeader name="Content-Type">
                <constant>application/octet-stream</constant>
          </setHeader>
          <to uri="https://localhost:8080/api/artifacts/${artifactId}/data"/>
        </route>
      </routes>`;
    console.log(contents);
    const blob = new Blob([contents], {type: 'application/xml'});
    await this.connectorApi.routesApacheCamelService.addRoutes({file: blob});
  }

  async createHttpEndpointArtifact(
    artifact: Artifact,
    endpointUrl: string,
    mimeType: string,
    apiKey?: {headerKey: string; value: string} | undefined,
    basicAuth?: {username: string; password: string} | undefined,
    ressourcePolling?: {delay: number; period: number} | undefined
  ): Promise<string> {
    let createdArtifact: ObjectWithSelfReference;
    if (ressourcePolling) {
      createdArtifact = await this.connectorApi.artifactsService.createArtifact(
        {
          title: artifact.name,
        }
      );
      await this.createCustomCamelRoute(
        getIdFromURL(getSelfRefId(createdArtifact)),
        endpointUrl,
        ressourcePolling.delay,
        ressourcePolling.period,
        mimeType,
        basicAuth
      );
    } else {
      const endpoint = await this.connectorApi.endpointsService.createEndpoint({
        location: endpointUrl,
        type: 'GENERIC',
      });
      if (apiKey && basicAuth) {
        throw Error('Either basicAuth or apiKey can be set, not both.');
      } else if (apiKey || basicAuth) {
        // If auth is required, create datasource and link to endpoint
        const dataSource = apiKey
          ? await this.connectorApi.dataSourcesService.createDataSource({
              apiKey: {
                key: apiKey.headerKey,
                value: apiKey.value,
              },
              type: 'REST',
            })
          : await this.connectorApi.dataSourcesService.createDataSource({
              basicAuth: {
                key: basicAuth!.username,
                value: basicAuth!.password,
              },
              type: 'REST',
            });
        await this.connectorApi.endpointsService.linkDataSource(
          getSelfRefId(endpoint),
          getSelfRefId(dataSource)
        );
      }
      createdArtifact = await this.createArtifactForEndpoint(
        {name: artifact.name},
        endpoint as ObjectWithSelfReference
      );
    }
    return getSelfRefId(createdArtifact);
  }

  async createDatabaseArtifact(
    artifact: Artifact,
    url: string,
    database: DatabaseType,
    username: string,
    password: string,
    sqlQuery: string
  ): Promise<string> {
    const dataSource =
      await this.connectorApi.dataSourcesService.createDataSource({
        type: 'DATABASE',
        url: url,
        driverClassName: this.getDatabaseDriverName(database),
        basicAuth: {
          key: username,
          value: password,
        },
      });
    const endpoint = await this.connectorApi.endpointsService.createEndpoint({
      location: `sql:${sqlQuery}?initialDelay=10000&delay=15000&useIterator=false`,
      type: 'GENERIC',
    });
    console.log(endpoint);
    await this.connectorApi.endpointsService.linkDataSource(
      getSelfRefId(endpoint),
      getSelfRefId(dataSource)
    );
    const createdArtifact = await this.createArtifactForEndpoint(
      {name: artifact.name},
      endpoint as ObjectWithSelfReference
    );
    return getSelfRefId(createdArtifact);
  }

  private async createArtifactForEndpoint(
    artifact: Artifact,
    endpoint: ObjectWithSelfReference
  ): Promise<ArtifactView> {
    const route = await this.connectorApi.routesService.createRoute({
      title: artifact.name + ' Route',
      deploy: RouteDesc.deploy.CAMEL,
    });
    const routeId = getSelfRefId(route);
    await this.connectorApi.routesService.createStartEndpoint(
      routeId,
      endpoint._links!.self.href!
    );
    return await this.connectorApi.artifactsService.createArtifact({
      title: artifact.name,
      description: artifact.description,
      accessUrl: route._links!.self.href!,
    });
  }

  /*makeContractForArtifact(endPointUrl: string, artifactId: sring): Promise<string> {

  }

  getArtifactsForContract<T>(contractId: string): Promise<T>;*/

  async getAllOffers(endPointUrl: string): Promise<
    {
      offerId: string;
      contractOfferId: string;
      assetId: string;
      assetName: string;
    }[]
  > {
    const connectorDescription = JSON.parse(
      await this.connectorApi.messagingService.sendIdsDescription(
        `${endPointUrl}/api/ids/data`
      )
    );
    //console.log(connectorDescription, 'Connector Description');

    const catalogDescription = JSON.parse(
      await this.connectorApi.messagingService.sendIdsDescription(
        `${endPointUrl}/api/ids/data`,
        connectorDescription['ids:resourceCatalog'][0]['@id']
      )
    );

    //console.log(catalogDescription['ids:offeredResource'][0]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return catalogDescription['ids:offeredResource'].map((e: any) => {
      return {
        offerId: getIdFromURL(e['@id']),
        contractOfferId: getIdFromURL(e['ids:contractOffer'][0]['@id']),
        assetId: getIdFromURL(
          e['ids:representation'][0]['ids:instance'][0]['@id']
        ),
        assetName: e['ids:title'][0]['@value'],
      };
    });
  }

  async getContractOfferDescription(
    endPointUrl: string,
    contractOfferId: string
  ): Promise<unknown> {
    const contractOfferDescription = JSON.parse(
      await this.connectorApi.messagingService.sendIdsDescription(
        `${endPointUrl}/api/ids/data`,
        `${endPointUrl}/api/contracts/${contractOfferId}`
      )
    );

    return contractOfferDescription;
  }

  async negotiateContract(
    endPointUrl: string,
    offeredRessource: {
      offerId: string;
      contractOfferId: string;
      assetId: string;
      assetName: string;
    }
  ): Promise<{contractId: string}> {
    const contractOfferDescription = await this.getContractOfferDescription(
      endPointUrl,
      offeredRessource.contractOfferId
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contract: Rule = (contractOfferDescription as any)[
      'ids:permission'
    ][0];
    contract[
      'ids:target'
    ] = `${endPointUrl}/api/artifacts/${offeredRessource.assetId}`;

    const contractResponse = JSON.parse(
      await this.connectorApi.messagingService.sendContractRequestMessage(
        `${endPointUrl}/api/ids/data`,
        [`${endPointUrl}/api/offers/${offeredRessource.offerId}`],
        [`${endPointUrl}/api/artifacts/${offeredRessource.assetId}`],
        false,
        [contract]
      )
    );
    //console.log(contractResponse);

    return {contractId: getIdFromURL(getSelfRefId(contractResponse))};
  }

  async getArtifactsForAgreement(contractId: string): Promise<{url: string}[]> {
    const artifactsForAgreement =
      await this.connectorApi.contractsService.getArtifactsForAgreement(
        contractId
      );

    return artifactsForAgreement._embedded!.artifacts!.map(e => {
      return {url: e._links!.self.href!};
    });
  }

  async downloadArtifact(
    artifactUrl: string,
    forceDownload?: boolean,
    forwardToRouteIds?: string[]
  ): Promise<unknown> {
    return await this.connectorApi.artifactsService.getDataQuery(
      getIdFromURL(artifactUrl),
      forceDownload,
      undefined,
      forwardToRouteIds
    );
  }

  async getFirstArtifact<T>(endPointUrl: string): Promise<T> {
    const offeredRessource = (await this.getAllOffers(endPointUrl))[0];

    const contract = await this.negotiateContract(
      endPointUrl,
      offeredRessource
    );

    const artifactsForAgreement = await this.getArtifactsForAgreement(
      contract.contractId
    );

    return (await this.downloadArtifact(artifactsForAgreement[0].url)) as T;
  }

  async createOfferForArtifact(
    artifactId: string,
    offer: Offer,
    representation: {
      name?: string;
      standard?: string;
      mediaType: string;
    },
    catalog: {name: string; description?: string},
    policy?: UsagePolicy
  ): Promise<unknown> {
    const createdCatalog =
      await this.connectorApi.catalogsService.createCatalog({
        title: catalog.name,
        description: catalog.description,
      });

    const createdOffer =
      await this.connectorApi.offeredResourcesService.createOffer({
        title: offer.name,
        description: offer.description,
        keywords: offer.keywords,
        publisher: offer.publisher,
        language: offer.language,
        license: offer.license,
        sovereign: offer.sovereign,
        samples: [],
      });

    const createdRepresentation =
      await this.connectorApi.representationsService.createRepresentation({
        title: representation.name,
        mediaType: representation.mediaType,
        standard: representation.standard,
      });

    const contract = await this.connectorApi.contractsService.createContract({
      title: offer.name + 'Contract Offer',
      description: 'created for offer ' + offer.name,
      start: offer.start ? offer.start!.toISOString() : undefined,
      end: offer.end ? offer.end.toISOString() : undefined,
    });

    const rule = await this.connectorApi.rulesService.createRule(
      UsageRuleMapper.mapUsagePolicyRule(policy)
    );

    await this.connectorApi.catalogsService.addOfferedRessourceToCatalog(
      getSelfRefId(createdCatalog),
      [getSelfRefId(createdOffer)]
    );

    await this.connectorApi.offeredResourcesService.addRepresentationToOfferedResource(
      getSelfRefId(createdOffer),
      [getSelfRefId(createdRepresentation)]
    );
    await this.connectorApi.representationsService.addRepresentationArtifact(
      getSelfRefId(createdRepresentation),
      [artifactId]
    );
    await this.connectorApi.offeredResourcesService.addContractToResource(
      getSelfRefId(createdOffer),
      [getSelfRefId(contract)]
    );
    await this.connectorApi.contractsService.addRuleToContract(
      getSelfRefId(contract),
      [getSelfRefId(rule)]
    );

    return true;
  }

  async setHttpDataReceiver(url: string): Promise<void> {
    // Route zu Datensenke
    const endpoint = await this.connectorApi.endpointsService.createEndpoint({
      location: url,
      type: 'GENERIC',
    });
    const route = await this.connectorApi.routesService.createRoute({
      title: 'Datasink route',
      deploy: RouteDesc.deploy.CAMEL,
    });
    this.httpRouteId = getSelfRefId(route);
    await this.connectorApi.routesService.createLastEndpoint(
      getSelfRefId(route),
      getSelfRefId(endpoint)
    );
  }
}
