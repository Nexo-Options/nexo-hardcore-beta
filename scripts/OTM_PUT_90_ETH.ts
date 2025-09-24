import { ethers, deployments } from "hardhat"
import { BigNumber as BN, Signer } from "ethers"
import { solidity } from "ethereum-waffle"
import chai from "chai"
import { NexoStrategyPut } from "../typechain/NexoStrategyPut"
import { WethMock } from "../typechain/WethMock"
import { OtmPriceCalculator } from "../typechain/OtmPriceCalculator"
import { AggregatorV3Interface } from "../typechain/AggregatorV3Interface"
import { Erc20Mock as ERC20 } from "../typechain/Erc20Mock"
import { NexoOperationalTreasury } from "../typechain/NexoOperationalTreasury"

function round(spotPrice: number, percent: number, decimals: number) {
  let otmStrike = ((spotPrice / 1e8) * percent) / 100
  let remainder = otmStrike % decimals
  let strike
  remainder >= decimals / 2
    ? (strike = Math.round(otmStrike / decimals) * decimals)
    : (strike = Math.floor(otmStrike / decimals) * decimals)
  return strike * 1e8
}

const hre = require("hardhat");

async function main() {
  chai.use(solidity)
  const { expect } = chai

  const fixture = deployments.createFixture(async ({ deployments }) => {

    const [deployer, alice] = await ethers.getSigners()

    return {
      deployer,
      alice,
      nexoOtmPutETH: (await ethers.getContract(
        "NexoStrategyOTM_PUT_90_ETH",
      )) as NexoStrategyPut,
      USDC: (await ethers.getContract("USDC")) as ERC20,
      WETH: (await ethers.getContract("WETH")) as ERC20,
      OtmPriceCalculator_ETH: (await ethers.getContract(
        "PriceCalculatorOTM_CALL_110_ETH",
      )) as OtmPriceCalculator,
      ethPriceFeed: (await ethers.getContract(
        "PriceProviderETH",
      )) as AggregatorV3Interface,
      NexoOperationalTreasury: (await ethers.getContract(
        "NexoOperationalTreasury",
      )) as NexoOperationalTreasury,
    }
  })
  let contracts: Awaited<ReturnType<typeof fixture>>

  contracts = await fixture()
  const { alice, deployer, nexoOtmPutETH, WETH, USDC, OtmPriceCalculator_ETH, ethPriceFeed } = contracts
  await nexoOtmPutETH.setLimit(
    ethers.utils.parseUnits("1000000", await USDC.decimals()),
  )
  let balance_before = await USDC.balanceOf(await alice.getAddress())
  let currentPrice = 3200e8
  let percent = 90
  await ethPriceFeed.setPrice(currentPrice)
  let strike = round(currentPrice, percent, 100)
  // await pricerETH.connect(deployer).setStrategy(nexoStraddleETH.address)
  await nexoOtmPutETH
    .connect(alice)
    .buy(
      await alice.getAddress(),
      86400*10,
      BN.from(ethers.utils.parseUnits("2", await WETH.decimals())),
      strike,
  )
  let balance_after = await USDC.balanceOf(await alice.getAddress())
  let alice_spent = balance_after.sub(balance_before)
  console.log("ETH-PUT-90 Total Cost (USD)", ethers.utils.formatUnits(alice_spent, await USDC.decimals()))
  console.log("ETH-PUT-90 completed.")

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
