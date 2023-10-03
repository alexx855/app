export function getStreams(assetAddress: string, address: string, canceled: boolean) {
  return `
  {
    streams(orderBy: timestamp, orderDirection: asc, where:{ asset:"${assetAddress}", recipient: "${address}", canceled: ${canceled}}) {
      id
      tokenId
      recipient
      startTime
      endTime
      depositAmount
      withdrawnAmount
      canceled
    }
  }
  `;
}