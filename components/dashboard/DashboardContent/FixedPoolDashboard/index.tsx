import React from 'react';
import dynamic from 'next/dynamic';

const EmptyState = dynamic(() => import('components/EmptyState'));

import { Grid, Typography } from '@mui/material';
import FixedPoolDashboardTable from 'components/dashboard/DashboardContent/FixedPoolDashboard/FixedPoolDashboardTable';
import useFixedPools from 'hooks/useFixedPools';

type Props = {
  type: 'deposit' | 'borrow';
};

function FixedPoolDashboard({ type }: Props) {
  const { deposits, borrows } = useFixedPools();

  return (
    <Grid
      width={'100%'}
      my={4}
      p="24px"
      boxShadow="0px 4px 12px rgba(175, 177, 182, 0.2)"
      borderRadius="0px 0px 6px 6px"
      bgcolor="white"
      borderTop="4px solid #008CF4"
    >
      <Typography variant="h6">Fixed Interest Rate</Typography>
      {type && <FixedPoolDashboardTable fixedPools={type === 'deposit' ? deposits : borrows} type={type} />}
      {type === 'deposit' && !deposits && <EmptyState connected tab={type} />}
      {type === 'borrow' && !borrows && <EmptyState connected tab={type} />}
    </Grid>
  );
}

export default FixedPoolDashboard;
