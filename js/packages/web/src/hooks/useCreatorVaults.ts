import { useMeta } from '../contexts';
import { StringPublicKey } from '@oyster/common';
import { isVaultV1Account } from '@oyster/common';

export const useCreatorVaults = (id?: StringPublicKey) => {
  const { metadata } = useMeta();

  const filtered = metadata.filter(
    m =>
      isVaultV1Account(m.account) &&
      m.info.data.creators?.some(c => c.address === id),
  );

  return filtered;
};
