import { Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  setVaultAuthority,
  StringPublicKey,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

// This command sets the authorities on the vault to be the newly created fraction manager.
// TODO need to make sure this works with actual fraction manager
export async function setVaultFractionAuthorities(
  wallet: WalletSigner,
  vault: StringPublicKey,
  fractionManager: StringPublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  await setVaultAuthority(
    vault,
    wallet.publicKey.toBase58(),
    fractionManager,
    instructions,
  );

  return { instructions, signers };
}
