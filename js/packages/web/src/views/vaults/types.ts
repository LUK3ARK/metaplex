//import { useItems } from "../artworks/hooks/useItems";
import { Metadata, ParsedAccount } from '@oyster/common';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';

// TODO Eventually build selection for different types of vault lookups
// TODO but for now just couple functionality like 'display all vaults that I have created/ created on entire platform'
// Metaplex view state just means entire metaplex platform
export enum VaultViewState {
  Metaplex = '0',
  Active = '1',
  Combined = '2',
  Created = '3',
  CreatedAndActive = '4',
  CreatedAndCombined = '5',
}

// In this case items will be the vaults that we are browsing

export type Item = SafetyDepositDraft | ParsedAccount<Metadata>;
