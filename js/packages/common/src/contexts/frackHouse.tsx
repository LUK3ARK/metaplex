import React, {
  createContext,
  FC,
  useState,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { getFrackHouseID, setFrackHouseId, StringPublicKey } from '../utils';
import { useQuerySearch } from '../hooks';

interface FrackHouseConfig {
  // Frack House Address
  frackHouseAddress?: StringPublicKey;
  // Frack House was configured via ENV or query params
  isConfigured: boolean;
  // Initial calculating of Frack House address completed (successfully or not)
  isFrackHouseReady: boolean;
  // recalculate Frack House address for specified owner address
  setFrackHouseForOwner: (ownerAddress?: string) => Promise<string | undefined>;
}

export const FrackHouseContext = createContext<FrackHouseConfig>(null!);

export const FrackHouseProvider: FC<{
  ownerAddress?: string;
  frackHouseAddress?: string;
}> = ({ children, ownerAddress, frackHouseAddress }) => {
  const searchParams = useQuerySearch();
  const ownerAddressFromQuery = searchParams.get('frackHouse');

  const initOwnerAddress = ownerAddressFromQuery || ownerAddress;
  const initFrackHouseAddress = !ownerAddressFromQuery ? frackHouseAddress : undefined;
  const isConfigured = Boolean(initFrackHouseAddress || initOwnerAddress);

  const [frackHouse, setFrackHouse] = useState<
    Pick<FrackHouseConfig, 'frackHouseAddress' | 'isFrackHouseReady'>
  >({
    frackHouseAddress: initFrackHouseAddress,
    isFrackHouseReady: Boolean(!initOwnerAddress || initFrackHouseAddress),
  });

  const setFrackHouseForOwner = useMemo(
    () => async (ownerAddress?: string) => {
      const frackHouseAddress = await getFrackHouseID(ownerAddress);
      setFrackHouseId(frackHouseAddress); // fallback
      setFrackHouse({ frackHouseAddress, isFrackHouseReady: true });
      console.log(`CUSTOM FRACK HOUSE: ${frackHouseAddress}`);
      return frackHouseAddress;
    },
    [],
  );

  useEffect(() => {
    console.log(`FRACK_HOUSE_OWNER_ADDRESS: ${initOwnerAddress}`);
    if (initOwnerAddress && !initFrackHouseAddress) {
      setFrackHouseForOwner(initOwnerAddress);
    } else {
      setFrackHouseId(initFrackHouseAddress); // fallback
      console.log(`CUSTOM FRACK HOUSE FROM ENV: ${initFrackHouseAddress}`);
    }
  }, [initOwnerAddress]);

  return (
    <FrackHouseContext.Provider value={{ ...frackHouse, setFrackHouseForOwner, isConfigured }}>
      {children}
    </FrackHouseContext.Provider>
  );
};

export const useFrackHouse = () => {
  return useContext(FrackHouseContext);
};
