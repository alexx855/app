function parseHealthFactor(debt: number, collateral: number) {
  //TODO => check case when the user doesn't have any collateral or debt

  if (collateral <= 0 || debt <= 0) {
    return '1';
  } else {
    const healthFactor = collateral / debt;

    if (healthFactor > 100) return '100x';

    return `${(collateral / debt).toFixed(0)}x`;
  }
}
export default parseHealthFactor;
