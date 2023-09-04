import React from 'react';
import { getAddress } from 'viem';
import { Box, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { useHistory, useQueued } from '../api';
import { ABIContext, type Contracts } from '../Decode';
import Events from '../Events';

const MULTISIG = getAddress('0xC0d6Bc5d052d1e74523AD79dD5A954276c9286D3');

type Props = {
  contracts: Contracts;
};

export default React.memo(function Feed({ contracts }: Props) {
  const { t } = useTranslation();
  const { data: queued, isLoading: queuedIsLoading } = useQueued(MULTISIG);
  const { data: history, isLoading: historyIsLoading } = useHistory(MULTISIG);

  return (
    <ABIContext.Provider value={contracts}>
      <Box display="flex" flexDirection="column" gap={6}>
        <Events
          title={t('Queued Transactions')}
          empty={t('No transactions queued at the moment.')}
          data={queued}
          isLoading={queuedIsLoading}
        />
        <Divider />
        <Events
          title={t('Past Transactions')}
          empty={t('No transactions executed at the moment.')}
          data={history}
          isLoading={historyIsLoading}
        />
      </Box>
    </ABIContext.Provider>
  );
});