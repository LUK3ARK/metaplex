import { Layout, Button } from 'antd';
import React from 'react';
import { useConnection, useStore } from '@oyster/common';
import { useMeta } from '../../contexts';
import { SalesListView } from './components/SalesList';
import { SetupView } from './setup';
import { saveFrackAdmin } from '../../actions/saveFrackAdmin';
import { useWallet } from '@solana/wallet-adapter-react';

export const HomeView = () => {
  const { isLoading, store } = useMeta();
  const { isConfigured } = useStore();
  const connection = useConnection();
  const wallet = useWallet();

  const showAuctions = (store && isConfigured) || isLoading;
  
  // todo - TEMPORARY REMOVE BUTTON AFTER
  const setup = () => {
    saveFrackAdmin(connection, wallet, true);
  }

  // TODO - INCLUDING THIS
  return (
    <Layout style={{ margin: 0, marginTop: 30, alignItems: 'center' }}>
      {showAuctions ? <SalesListView /> : <SetupView />}
      <Button onClick={setup}>
        click me
      </Button>
    </Layout>
  );
};
