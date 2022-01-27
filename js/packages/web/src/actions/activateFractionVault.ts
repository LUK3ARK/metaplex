import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { StringPublicKey, WalletSigner } from '@oyster/common';
import { FractionSafetyDepositConfig } from '@oyster/common/dist/lib/models/metaplex/index';
import { activateVault } from '@oyster/common/dist/lib/actions/vault';
import BN from 'bn.js';
import { FractionSafetyDepositDraft } from './createFractionManager';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

export interface FractionSafetyDepositInstructionTemplate {
  box: {
    tokenAccount?: StringPublicKey;
    tokenMint: StringPublicKey;
    amount: BN;
  };
  draft: FractionSafetyDepositDraft;
  config: FractionSafetyDepositConfig;
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
