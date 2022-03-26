import {
  AccountsProvider,
  ConnectionProvider,
  StoreProvider,
  FrackHouseProvider,
  WalletProvider,
  MetaProvider,
} from '@oyster/common';
import React, { FC } from 'react';
import { ConfettiProvider } from './components/Confetti';
import { AppLayout } from './components/Layout';
import { LoaderProvider } from './components/Loader';
import { CoingeckoProvider } from './contexts/coingecko';
import { SPLTokenListProvider } from './contexts/tokenList';

export const Providers: FC = ({ children }) => {
  return (
    <ConnectionProvider>
      <WalletProvider>
        <AccountsProvider>
          <SPLTokenListProvider>
            <CoingeckoProvider>
              <StoreProvider
                ownerAddress={process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}
                storeAddress={process.env.NEXT_PUBLIC_STORE_ADDRESS}
              >
                <FrackHouseProvider
                  ownerAddress={process.env.NEXT_PUBLIC_FRACK_HOUSE_OWNER_ADDRESS}
                  frackHouseAddress={process.env.NEXT_PUBLIC_FRACK_HOUSE_ADDRESS}
                >
                <MetaProvider>
                  <LoaderProvider>
                    <ConfettiProvider>
                      <AppLayout>{children}</AppLayout>
                    </ConfettiProvider>
                  </LoaderProvider>
                </MetaProvider>
                </FrackHouseProvider>
              </StoreProvider>
            </CoingeckoProvider>
          </SPLTokenListProvider>
        </AccountsProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
