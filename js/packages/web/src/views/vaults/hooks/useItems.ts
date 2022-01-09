import { useMeta, isVaultV1Account } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCreatorVaults } from '../../../hooks/useCreatorVaults';

import { VaultViewState, Item } from '../types';

//import { useUserMetadataWithPacks } from './useUserMetadataWithPacks';
//import { usePacksBasedOnProvingProcesses } from './usePacksBasedOnProvingProcesses';

export const useItems = ({
  activeKey,
}: {
  activeKey: VaultViewState;
}): Item[] => {
  const { publicKey } = useWallet();
  const { metadata } = useMeta();
  const createdVaultMetadata = useCreatorVaults(publicKey?.toBase58() || '');

  //const userMetadataWithPacks = useUserMetadataWithPacks();
  //const packsBasedOnProvingProcesses = usePacksBasedOnProvingProcesses();

  // todo: when adding metaplex active key, this is what is shown when not logged in to wallet
  if (activeKey === VaultViewState.Metaplex) {
    return createdVaultMetadata;
  }

  if (activeKey === VaultViewState.Created) {
    return createdVaultMetadata;
  }

  // TODO: ADD handling for other activeKeys (like another persons vaults)
  // if (activeKey === VaultViewState.Created) {
  //   return createdMetadata;
  // }

  // NOTE
  // In other case, metadata is parsed account, which some are vaults --- ParsedAccount<Vault>
  // return [...userMetadataWithPacks, ...packsBasedOnProvingProcesses];
  // Ensure fetched metadata are vaults
  const vaultMetadata = metadata.filter(m => isVaultV1Account(m.account));
  return vaultMetadata;
};
