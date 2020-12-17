/*
 * cloudbeaver - Cloud Database Manager
 * Copyright (C) 2020 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { action, computed } from 'mobx';

import { injectable, IInitializableController } from '@cloudbeaver/core-di';
import { NotificationService } from '@cloudbeaver/core-events';
import { DatabaseAuthModel, ObjectPropertyInfo } from '@cloudbeaver/core-sdk';

import { DatabaseAuthModelsResource } from '../../../../DatabaseAuthModelsResource';
import { DBDriver, DBDriverResource } from '../../../../DBDriverResource';
import { IConnectionFormModel } from '../IConnectionFormModel';

interface IParsedUrlParameters {
  host?: string;
  port?: string;
}
@injectable()
export class OptionsController
implements IInitializableController {
  @computed get drivers(): DBDriver[] {
    return Array.from(this.dbDriverResource.data.values())
      .filter(({ id }) => this.model.availableDrivers.includes(id));
  }

  @computed get driver(): DBDriver | undefined {
    return this.dbDriverResource.get(this.model.connection.driverId);
  }

  @computed get authModel(): DatabaseAuthModel | null {
    if (!this.model.connection?.authModel && !this.driver) {
      return null;
    }
    return this.dbAuthModelsResource.get(this.model.connection?.authModel || this.driver!.defaultAuthModel) || null;
  }

  @computed get authModelLoading(): boolean {
    return this.dbAuthModelsResource.isLoading();
  }

  @computed get properties(): ObjectPropertyInfo[] | undefined {
    if (this.model.connection.authProperties.length) {
      return this.model.connection.authProperties;
    }
    return this.authModel?.properties;
  }

  private model!: IConnectionFormModel;
  private nameTemplate = /^(\w+)@([\w:]+)?$/;

  constructor(
    private notificationService: NotificationService,
    private dbAuthModelsResource: DatabaseAuthModelsResource,
    private dbDriverResource: DBDriverResource,
  ) { }

  init(model: IConnectionFormModel): void {
    this.model = model;
    this.loadDrivers();
  }

  onSelectDriver = (
    driverId: string | null,
    name: string | undefined,
    prevValue: string | null
  ): Promise<void> => this.loadDriver(driverId, prevValue);

  onFormChange = (value?: unknown, name?: string): void => {
    this.updateName(name);
  };

  @action
  private setDefaults(prevDriverId: string | null) {
    this.setDefaultParameters(prevDriverId);
    this.cleanCredentials();
    this.model.connection.properties = {};
    this.model.connection.authModel = this.driver?.defaultAuthModel;
  }

  private cleanCredentials() {
    for (const property of Object.keys(this.model.credentials)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.model.credentials[property];
    }
  }

  private setDefaultParameters(prevDriverId?: string | null) {
    const prevDriver = this.dbDriverResource.get(prevDriverId || '');

    if (this.model.connection.host === prevDriver?.defaultServer) {
      this.model.connection.host = this.driver?.defaultServer || 'localhost';
    }

    if (this.model.connection.port === prevDriver?.defaultPort) {
      this.model.connection.port = this.driver?.defaultPort;
    }

    if (this.model.connection.databaseName === prevDriver?.defaultDatabase) {
      this.model.connection.databaseName = this.driver?.defaultDatabase;
    }

    if (this.model.connection.url === prevDriver?.sampleURL) {
      this.model.connection.url = this.driver?.sampleURL;
    }

    this.updateName();
  }

  private getParametersFromUrl(url: string) {
    const parameters: IParsedUrlParameters = {};
    const isParameterValidRegex = /[\[,\],{,}]+/;
    const urlTemplateRegex = /^.*:\/\/(.*?)(:.*?|)(\/(.*)?|)$/;

    const parsedParameters = urlTemplateRegex.exec(url);
    if (!parsedParameters) {
      return null;
    }

    const isValidParameter = (parameter: string) => !isParameterValidRegex.test(parameter);

    parameters.host = isValidParameter(parsedParameters[1]) ? parsedParameters[1] : undefined;
    parameters.port = isValidParameter(parsedParameters[2]) ? parsedParameters[2] : undefined;

    return parameters;
  }

  private updateName(name?: string) {
    if (name === 'name') {
      return;
    }

    let host = this.model.connection.host;
    let port = this.model.connection.port;

    if (this.model.connection.url && !host && !port) {
      const urlParameters = this.getParametersFromUrl(this.model.connection.url || '');
      host = urlParameters?.host;
      port = urlParameters?.port?.slice(1);
    }

    const databaseNames = ['New', ...this.drivers.map(driver => driver.name!)]
      .filter(Boolean);

    const matches = this.nameTemplate.exec(this.model.connection.name);

    if (this.model.connection.name === undefined
        || (matches?.length && databaseNames.includes(matches[1]))) {
      this.model.connection.name = this.getNameTemplate(host, port);
    }
  }

  private getNameTemplate(host?: string, port?: string) {
    if (this.driver) {
      const address = [host, host && port]
        .filter(Boolean)
        .join(':');

      return `${this.driver.name}@${address || ''}`;
    }

    return 'New connection';
  }

  private async loadDrivers() {
    try {
      await this.dbDriverResource.loadAll();
      await this.dbAuthModelsResource.load(
        this.model.connection.authModel || this.driver!.defaultAuthModel
      );
      this.setDefaultParameters();
    } catch (exception) {
      this.notificationService.logException(exception, 'Can\'t load drivers');
    }
  }

  private async loadDriver(driverId: string | null, prev: string | null) {
    if (!driverId) {
      this.model.connection.authModel = undefined;
      return;
    }

    try {
      await this.dbDriverResource.load(driverId);
      await this.dbAuthModelsResource.load(
        this.model.connection.authModel || this.driver!.defaultAuthModel
      );
      this.setDefaults(prev);
    } catch (exception) {
      this.notificationService.logException(exception, `Can't load driver ${driverId}`);
    }
  }
}
