import chai from "chai"
import {NexoStrategyStraddle} from "../typechain/NexoStrategyStraddle"
import {NexoStrategyStrip} from "../typechain/NexoStrategyStrip"
import {NexoStrategyCall} from "../typechain/NexoStrategyCall"
import {NexoStrategyPut} from "../typechain/NexoStrategyPut"
import {WethMock} from "../typechain/WethMock"
import {PriceCalculator} from "../typechain/PriceCalculator"
import {AggregatorV3Interface} from "../typechain/AggregatorV3Interface"
import {Erc20Mock as ERC20} from "../typechain/Erc20Mock"
import {NexoOperationalTreasury} from "../typechain/NexoOperationalTreasury"
import {NexoStakeAndCover} from "../typechain/NexoStakeAndCover"
import {ethers} from "hardhat"

const hre = require("hardhat")

async function main() {
  const fixture = hre.deployments.createFixture(async ({}) => {
    const [deployer, alice] = await ethers.getSigners()

    return {
      deployer,
      alice,
      nexoStakeAndCover: (await ethers.getContract(
        "NexoStakeAndCover",
      )) as NexoStakeAndCover,
      nexoStraddleETH: (await ethers.getContract(
        "NexoStrategyStraddleETH",
      )) as NexoStrategyStraddle,
      nexoStraddleBTC: (await ethers.getContract(
        "NexoStrategyStraddleBTC",
      )) as NexoStrategyStraddle,
      USDC: (await ethers.getContract("USDC")) as ERC20,
      NEXO: (await ethers.getContract("NEXO")) as ERC20,
      WETH: (await ethers.getContract("WETH")) as ERC20,
      WBTC: (await ethers.getContract("WBTC")) as ERC20,
      pricerETH: (await ethers.getContract(
        "PriceCalculatorStraddleETH",
      )) as PriceCalculator,
      pricerBTC: (await ethers.getContract(
        "PriceCalculatorStraddleBTC",
      )) as PriceCalculator,
      ethPriceFeed: (await ethers.getContract(
        "PriceProviderETH",
      )) as AggregatorV3Interface,
      btcPriceFeed: (await ethers.getContract(
        "PriceProviderBTC",
      )) as AggregatorV3Interface,
      NexoOperationalTreasury: (await ethers.getContract(
        "NexoOperationalTreasury",
      )) as NexoOperationalTreasury,
      nexoOTM_CALL_110_ETH: (await ethers.getContract(
        "NexoStrategyOTM_CALL_110_ETH",
      )) as NexoStrategyCall,
      nexoOTM_PUT_90_ETH: (await ethers.getContract(
        "NexoStrategyOTM_PUT_90_ETH",
      )) as NexoStrategyPut,
      nexoOTM_PUT_90_BTC: (await ethers.getContract(
        "NexoStrategyOTM_PUT_90_BTC",
      )) as NexoStrategyPut,
      nexoOTM_CALL_110_BTC: (await ethers.getContract(
        "NexoStrategyOTM_CALL_110_BTC",
      )) as NexoStrategyCall,
      nexoStrategyStripETH: (await ethers.getContract(
        "NexoStrategyStripETH",
      )) as NexoStrategyStrip,
    }
  })

  let contracts: Awaited<ReturnType<typeof fixture>>

  contracts = await fixture()
  const {
    alice,
    deployer,
    nexoStraddleETH,
    nexoStraddleBTC,
    nexoStrategyStripETH,
    nexoOTM_CALL_110_ETH,
    nexoOTM_PUT_90_ETH,
    nexoOTM_PUT_90_BTC,
    nexoOTM_CALL_110_BTC,
    USDC,
    NEXO,
    NexoOperationalTreasury,
    ethPriceFeed,
    btcPriceFeed,
    nexoStakeAndCover,
  } = contracts

  await USDC.mintTo(
    NexoOperationalTreasury.address,
    hre.ethers.utils.parseUnits("1000000000000000", await USDC.decimals()),
  )
  await NexoOperationalTreasury.addTokens()

  await USDC.mintTo(
    await alice.getAddress(),
    ethers.utils.parseUnits("1000000000000000", await USDC.decimals()),
  )

  await NEXO.mintTo(
    nexoStakeAndCover.address,
    ethers.utils.parseUnits("100000000"),
  )
  await USDC.mintTo(nexoStakeAndCover.address, "1000000000000")
  await nexoStakeAndCover.saveFreeTokens()
  console.log(await nexoStakeAndCover.totalBalance())

  await nexoStakeAndCover.transferShare(
    await ethers.getSigners().then((x) => x[1].getAddress()),
    ethers.utils.parseUnits("59000000"),
  )
  await nexoStakeAndCover.transferShare(
    await ethers.getSigners().then((x) => x[2].getAddress()),
    ethers.utils.parseUnits("12300000"),
  )

  console.log("Preparation completed!")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
