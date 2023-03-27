import * as navbar from '../../steps/navbar';
import { deposit, enterMarket } from '../../steps/actions';
import borrow, { attemptBorrow } from '../../steps/common/borrow';
import { setupFork } from '../../steps/setup';

describe('WETH floating borrow', () => {
  const { visit, setBalance, userAddress } = setupFork();

  before(() => {
    visit('/');
  });

  before(async () => {
    await setBalance(userAddress(), {
      ETH: 100,
    });
  });

  attemptBorrow({ type: 'floating', symbol: 'ETH', amount: '1' });

  describe('Setup environment for a successful borrow', () => {
    it('should go to the dashboard and enter market for ETH', () => {
      navbar.goTo('dashboard');
      enterMarket({ symbol: 'ETH' });
    });

    it('should go to markets and deposit some ETH', () => {
      navbar.goTo('markets');
      deposit({ symbol: 'ETH', type: 'floating', amount: '1' });
    });
  });

  borrow({
    type: 'floating',
    symbol: 'ETH',
    decimals: 18,
    amount: '0.1',
    aboveLimitAmount: '1',
    aboveLiquidityAmount: 1_000_000,
    shouldApprove: true,
  });
});
