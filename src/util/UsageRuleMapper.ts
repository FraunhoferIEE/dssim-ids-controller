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

import {ContractRuleDesc} from 'dsc-lib';
import {
  UsagePolicy,
  NumberUsagesRestricted,
  UsagePolicyType,
  TimerangeRestricted,
  UnrestrictedPolicy,
} from 'dssim-core';

export class UsageRuleMapper {
  static mapUsagePolicyRule(usagePolicy?: UsagePolicy): ContractRuleDesc {
    if (!usagePolicy) {
      return unrestrictedPolicy;
    } else if (isNumberUsagesRestricted(usagePolicy)) {
      return numberUsagesRestricted(usagePolicy.usageTimes);
    } else if (isTimerangeRestricted(usagePolicy)) {
      return timerangeRestricted(usagePolicy.startTime, usagePolicy.endTime);
    } else if (isUnrestrictedPolicy(usagePolicy)) {
      return unrestrictedPolicy;
    } else {
      throw Error('Usage policy not implemented by connector controller.');
    }
  }
}

const unrestrictedPolicy = {
  value: JSON.stringify({
    '@context': {
      ids: 'https://w3id.org/idsa/core/',
      idsc: 'https://w3id.org/idsa/code/',
    },
    '@type': 'ids:Permission',
    '@id':
      'https://w3id.org/idsa/autogen/permission/cf1cb758-b96d-4486-b0a7-f3ac0e289588',
    'ids:action': [
      {
        '@id': 'idsc:USE',
      },
    ],
    'ids:description': [
      {
        '@value': 'provide-access',
        '@type': 'http://www.w3.org/2001/XMLSchema#string',
      },
    ],
    'ids:title': [
      {
        '@value': 'Example Usage Policy',
        '@type': 'http://www.w3.org/2001/XMLSchema#string',
      },
    ],
  }),
};
const numberUsagesRestricted = (usageTimes: number) => {
  return {
    value: JSON.stringify({
      '@context': {
        ids: 'https://w3id.org/idsa/core/',
        idsc: 'https://w3id.org/idsa/code/',
      },
      '@type': 'ids:Permission',
      '@id':
        'https://w3id.org/idsa/autogen/permission/4ad88c11-a00c-4479-94f6-2a68cce005ea',
      'ids:description': [
        {
          '@value': 'n-times-usage',
          '@type': 'http://www.w3.org/2001/XMLSchema#string',
        },
      ],
      'ids:title': [
        {
          '@value': 'Example Usage Policy',
          '@type': 'http://www.w3.org/2001/XMLSchema#string',
        },
      ],
      'ids:action': [
        {
          '@id': 'idsc:USE',
        },
      ],
      'ids:constraint': [
        {
          '@type': 'ids:Constraint',
          '@id':
            'https://w3id.org/idsa/autogen/constraint/a5d77dcd-f838-48e9-bdc1-4b219946f8ac',
          'ids:rightOperand': {
            '@value': usageTimes,
            '@type': 'http://www.w3.org/2001/XMLSchema#double',
          },
          'ids:leftOperand': {
            '@id': 'idsc:COUNT',
          },
          'ids:operator': {
            '@id': 'idsc:LTEQ',
          },
        },
      ],
      //  "ids:target": [...]
    }),
  };
};

const timerangeRestricted = (startTime: Date, endTime: Date) => {
  return {
    value: JSON.stringify({
      '@context': {
        xsd: 'http://www.w3.org/2001/XMLSchema#',
        ids: 'https://w3id.org/idsa/core/',
        idsc: 'https://w3id.org/idsa/code/',
      },
      '@type': 'ids:Permission',
      '@id':
        'https://w3id.org/idsa/autogen/permission/8bca11ab-e5f7-4e13-9c2b-5b3ab1f924c9',
      'ids:description': [
        {
          '@value': '',
          '@type': 'http://www.w3.org/2001/XMLSchema#string',
        },
      ],
      'ids:title': [
        {
          '@value': '',
          '@type': 'http://www.w3.org/2001/XMLSchema#string',
        },
      ],
      'ids:constraint': [
        {
          '@type': 'ids:Constraint',
          '@id':
            'https://w3id.org/idsa/autogen/constraint/552e3c42-64b4-4df6-ae21-495f7e79ee11',
          'ids:rightOperand': {
            '@value': startTime.toISOString(), // e.g. '2023-03-31T13:18:00Z'
            '@type': 'xsd:dateTimeStamp',
          },
          'ids:leftOperand': {
            '@id': 'https://w3id.org/idsa/code/POLICY_EVALUATION_TIME',
          },
          'ids:operator': {
            '@id': 'https://w3id.org/idsa/code/AFTER',
          },
        },
        {
          '@type': 'ids:Constraint',
          '@id':
            'https://w3id.org/idsa/autogen/constraint/e240b9da-3be4-4422-99b3-9d82d4fa45ea',
          'ids:rightOperand': {
            '@value': endTime.toISOString(),
            '@type': 'xsd:dateTimeStamp',
          },
          'ids:leftOperand': {
            '@id': 'https://w3id.org/idsa/code/POLICY_EVALUATION_TIME',
          },
          'ids:operator': {
            '@id': 'https://w3id.org/idsa/code/BEFORE',
          },
        },
      ],
      'ids:action': [
        {
          '@id': 'https://w3id.org/idsa/code/USE',
        },
      ],
    }),
  };
};

const isNumberUsagesRestricted = (
  instance: UsagePolicy
): instance is NumberUsagesRestricted => {
  return instance.type === UsagePolicyType.NumberUsagesRestricted;
};

const isTimerangeRestricted = (
  instance: UsagePolicy
): instance is TimerangeRestricted => {
  return instance.type === UsagePolicyType.TimerangeRestricted;
};

const isUnrestrictedPolicy = (
  instance: UsagePolicy
): instance is UnrestrictedPolicy => {
  return instance.type === UsagePolicyType.UnrestrictedPolicy;
};
