import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { StringPublicKey, WalletSigner } from '@oyster/common';
import { SafetyDepositConfig } from '@oyster/common/dist/lib/models/metaplex/index';
import { activateVault } from '@oyster/common/dist/lib/actions/vault';
import BN from 'bn.js';
import { SafetyDepositDraft } from './createAuctionManager';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

export interface SafetyDepositInstructionTemplate {
  box: {
    tokenAccount?: StringPublicKey;
    tokenMint: StringPublicKey;
    amount: BN;
  };
  draft: SafetyDepositDraft;
  config: SafetyDepositConfig;
}

export async function activateFractionVault(
  wallet: WalletSigner,
  vault: StringPublicKey,
  maxSupply: BN,
  fractionalMint: StringPublicKey,
  fractionTreasury: StringPublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  await activateVault(
    new BN(maxSupply),
    vault,
    fractionalMint,
    fractionTreasury,
    wallet.publicKey.toBase58(),
    instructions,
  );

  return { signers, instructions };
}
