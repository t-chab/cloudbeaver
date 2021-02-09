/*
 * cloudbeaver - Cloud Database Manager
 * Copyright (C) 2020-2021 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { observer } from 'mobx-react-lite';
import styled, { css } from 'reshadow';

import {
  TabsState, TabList,
  Button, BORDER_TAB_STYLES, TabPanelList
} from '@cloudbeaver/core-blocks';
import { useService } from '@cloudbeaver/core-di';
import { useTranslate } from '@cloudbeaver/core-localization';
import { useStyles, composes } from '@cloudbeaver/core-theming';

import { ConnectionFormService, IConnectionForm, IConnectionFormData, IConnectionFormOptions } from './ConnectionFormService';

const styles = composes(
  css`
    Tab {
      composes: theme-ripple theme-background-secondary theme-text-on-secondary from global;
    }

    TabList {
      composes: theme-background-surface theme-text-on-surface from global;
    }

    box {
      composes: theme-background-secondary theme-text-on-secondary from global;
    }

    content-box {
      composes: theme-background-secondary theme-border-color-background from global;
    }
  `,
  css`
    TabList {
      flex-shrink: 0;
    }
    box {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
      overflow: auto;
    }
    content-box {
      position: relative;
      display: flex;
      flex: 1;
      flex-direction: column;
      overflow: auto;
    }

    fill {
      flex: 1;
    }

    Button:not(:first-child) {
      margin-right: 24px;
    }
  `
);

interface Props {
  data: IConnectionFormData;
  options: IConnectionFormOptions;
  onBack?: () => void;
  onCancel?: () => void;
}

export const ConnectionForm = observer(function ConnectionForm({
  data,
  options,
  onBack = () => {},
  onCancel = () => {},
}: Props) {
  const style = [styles, BORDER_TAB_STYLES];
  const service = useService(ConnectionFormService);
  const translate = useTranslate();
  const form: IConnectionForm = {
    disabled: false,
    loading: false,
    onSubmit: () => {},
    originLocal: true,
  };

  return styled(useStyles(style))(
    <TabsState
      container={service.tabsContainer}
      data={data}
      form={form}
      options={options}
    >
      <box as='div'>
        <TabList style={style}>
          <fill as="div" />
          <Button
            type="button"
            disabled={form.disabled}
            mod={['outlined']}
            onClick={onBack}
          >
            {translate('ui_processing_cancel')}
          </Button>
          <Button
            type="button"
            disabled={form.disabled}
            mod={['outlined']}
            onClick={() => {}}
          >
            {translate('connections_connection_test')}
          </Button>
          <Button
            type="button"
            disabled={form.disabled}
            mod={['unelevated']}
            onClick={() => {}}
          >
            {translate(options.mode === 'edit' ? 'ui_processing_save' : 'ui_processing_create')}
          </Button>
        </TabList>
        <content-box as="div">
          <TabPanelList style={style} />
        </content-box>
      </box>
    </TabsState>
  );
});