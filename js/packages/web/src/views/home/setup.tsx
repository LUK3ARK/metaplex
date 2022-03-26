import {
  useConnection,
  useFrackHouse,
  useStore,
  useWalletModal,
  WhitelistedCreator,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { saveAdmin } from '../../actions/saveAdmin';
import { saveFrackAdmin } from '../../actions/saveFrackAdmin';
import { useMeta } from '../../contexts';
import { SetupVariables } from '../../components/SetupVariables';

export const SetupView = () => {
  const [isInitalizingStore, setIsInitalizingStore] = useState(false);
  const [isInitializingFrackHouse, setIsInitializingFrackHouse] = useState(false);
  const connection = useConnection();
  const { store, frackHouse } = useMeta();
  const { setStoreForOwner } = useStore();
  const { setFrackHouseForOwner } = useFrackHouse();
  const history = useHistory();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible],
  );
  const [storeAddress, setStoreAddress] = useState<string | undefined>();
  const [frackHouseAddress, setFrackHouseAddress] = useState<string | undefined>();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS) {
      const getStore = async () => {
        if (wallet.publicKey) {
          const store = await setStoreForOwner(wallet.publicKey.toBase58());
          setStoreAddress(store);
        } else {
          setStoreAddress(undefined);
        }
      };
      getStore();
    }

    if (!process.env.NEXT_PUBLIC_FRACK_HOUSE_OWNER_ADDRESS) {
      const getFrackHouse = async () => {
        if (wallet.publicKey) {
          const frackHouse = await setFrackHouseForOwner(wallet.publicKey.toBase58());
          setFrackHouseAddress(frackHouse);
        } else {
          setFrackHouseAddress(undefined);
        }
      };
      getFrackHouse();
    }
  }, [wallet.publicKey]);

  const initializeStore = async () => {
    if (!wallet.publicKey) {
      return;
    }

    setIsInitalizingStore(true);

    await saveAdmin(connection, wallet, false, [
      new WhitelistedCreator({
        address: wallet.publicKey.toBase58(),
        activated: true,
      }),
    ]);

    // TODO: process errors

    await setStoreForOwner(undefined);
    await setStoreForOwner(wallet.publicKey.toBase58());

    history.push('/admin');
  };

  const initializeFrackHouse = async () => {
    if (!wallet.publicKey) {
      return;
    }

    setIsInitializingFrackHouse(true);
    // todo - eventually add a way to configure it as public or normal
    const isPublic = true;
    await saveFrackAdmin(connection, wallet, isPublic);

    // TODO: process errors

    await setFrackHouseForOwner(undefined);
    await setFrackHouseForOwner(wallet.publicKey.toBase58());

    history.push('/admin');
  };

  return (
    <>
      {!wallet.connected && (
        <p>
          <Button type="primary" className="app-btn" onClick={connect}>
            Connect
          </Button>{' '}
          to configure store.
        </p>
      )}
      {wallet.connected && !store && (
        <>
          <p>Store is not initialized yet</p>
          <p>There must be some ◎ SOL in the wallet before initialization.</p>
          <p>
            After initialization, you will be able to manage the list of
            creators
          </p>

          <p>
            <Button
              className="app-btn"
              type="primary"
              loading={isInitalizingStore}
              onClick={initializeStore}
            >
              Init Store
            </Button>
          </p>
        </>
      )}
      {wallet.connected && store && !frackHouse && (
        <>
          <p>Frack house has not been initialized</p>
          <p>There must be some ◎ SOL in the wallet before initialization.</p>

          <p>
            <Button
              className="app-btn"
              type="primary"
              loading={isInitializingFrackHouse}
              onClick={initializeFrackHouse}
            >
              Init Frack House
            </Button>
          </p>
        </>
      )}
      {wallet.connected && store && frackHouse && (
        <>
          <p>
            To finish initialization please copy config below into{' '}
            <b>packages/web/.env</b> and restart yarn or redeploy
          </p>
          <SetupVariables
            storeAddress={storeAddress}
            storeOwnerAddress={wallet.publicKey?.toBase58()}
            frackHouseAddress={frackHouseAddress}
            frackHouseOwnerAddress={wallet.publicKey?.toBase58()}
          />
        </>
      )}
    </>
  );
};
