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

import {describe, it} from 'vitest';
import {expect} from 'chai';
import {DSCController} from '../../src/index.js';

describe('Connector Controller - MessagingService', () => {
  const consumer = new DSCController('consumer', 'admin', 'password', [
    {name: 'main', path: '/api/ids/data', port: 8080},
  ]);
  const provider = new DSCController('provider', 'admin', 'password', [
    {name: 'main', path: '/api/ids/data', port: 8080},
  ]);
  const providerUrl = 'https://provider:8080';

  it.skip('Get Connector Description', async () => {
    const result = await consumer.getDescription(providerUrl);
    console.log(result);
    expect(result).to.not.equal(null);
  });

  it.skip('Get Offers', async () => {
    const result = await consumer.getAllOffers(providerUrl);
    console.log(result);
    expect(result).to.not.equal(null);
  });

  it.skip('Sign Contracts and get Artifact Description', async () => {
    const result = await consumer.getFirstArtifact(providerUrl);
    console.log(result);
    expect(result).to.not.equal(null);
  });

  it.skip('Get contract offer description', async () => {
    const offers = await consumer.getAllOffers(providerUrl);
    const result = await consumer.getContractOfferDescription(
      providerUrl,
      offers[0].contractOfferId
    );
    console.log(result);
    expect(result).to.not.equal(null);
  });

  it.skip('negotiate contract', async () => {
    const offers = await consumer.getAllOffers(providerUrl);
    const result = await consumer.negotiateContract(providerUrl, offers[0]);
    console.log(result);
    expect(result).to.not.equal(null);
  });

  it.skip('get contract agreement artifacts', async () => {
    const result = await consumer.getArtifactsForAgreement(
      '4a23584b-02e5-4072-b556-93e08f870bc0'
    );
    console.log(result);
    expect(result).to.not.equal(null);
  });

  it.skip('download artifacts', async () => {
    const result = await consumer.downloadArtifact(
      'https://consumer/api/artifacts/4708e605-0747-4e15-894c-c68439154900'
    );
    console.log(result);
    expect(result).to.not.equal(null);
  });

  it('create database offer', async () => {
    await provider.createDatabaseArtifact(
      {
        name: 'database table',
      },
      'jdbc:postgresql://dbhost:5432/transferdata',
      'Postgres',
      'connector',
      '12345',
      'select * from tablename'
    );
  });
});
