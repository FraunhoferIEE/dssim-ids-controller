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

import {BrokerController, Endpoint} from 'dssim-core';
import {IDSBroker} from 'ids-broker-lib';

export class IDSBrokerController implements BrokerController {
  public brokerApi: IDSBroker;

  constructor(
    private hostname: string,
    private username: string,
    private password: string,
    private endpoints: Endpoint[]
  ) {
    this.brokerApi = new IDSBroker(
      `https://${hostname}${endpoints[0].path}`,
      username,
      password
    );
  }

  doSth(): unknown {
    throw new Error('Method not implemented.');
  }
}
