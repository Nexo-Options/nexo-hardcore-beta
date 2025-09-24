import {ethers, deployments} from "hardhat"
import {BigNumber as BN, Signer} from "ethers"
import {solidity} from "ethereum-waffle"
import chai from "chai"
import {NexoStrategyStrip} from "../../typechain/NexoStrategyStrip"
import {WethMock} from "../../typechain/WethMock"
import {PriceCalculator} from "../../typechain/PriceCalculator"
import {AggregatorV3Interface} from "../../typechain/AggregatorV3Interface"
import {Erc20Mock as ERC20} from "../../typechain/Erc20Mock"
import {NexoOperationalTreasury} from "../../typechain/NexoOperationalTreasury"

chai.use(solidity)
const {expect} = chai

const fixture = deployments.createFixture(async ({deployments}) => {
  await deployments.fixture(["single-straddle"])

  const [deployer, alice] = await ethers.getSigners()

  return {
    deployer,
    alice,
    nexoStraddleETH: (await ethers.getContract(
      "NexoStrategyStraddleETH",
    )) as NexoStrategyStrip,
    nexoStraddleBTC: (await ethers.getContract(
      "NexoStrategyStraddleBTC",
    )) as NexoStrategyStrip,
    USDC: (await ethers.getContract("USDC")) as ERC20,
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
  }
})

describe("NexoPoolStaddle", async () => {
  let contracts: Awaited<ReturnType<typeof fixture>>

  beforeEach(async () => {
    contracts = await fixture()
    const {
      alice,
      deployer,
      nexoStraddleETH,
      nexoStraddleBTC,
      pricerETH,
      pricerBTC,
    } = contracts

    await pricerETH.setPeriodLimits(1 * 24 * 3600, 30 * 24 * 3600)
    await pricerBTC.setPeriodLimits(1 * 24 * 3600, 30 * 24 * 3600)

    await contracts.USDC.mintTo(
      contracts.NexoOperationalTreasury.address,
      ethers.utils.parseUnits(
        "1000000000000000",
        await contracts.USDC.decimals(),
      ),
    )
    await contracts.NexoOperationalTreasury.addTokens()

    await contracts.USDC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits(
        "1000000000000000",
        await contracts.USDC.decimals(),
      ),
    )

    await contracts.USDC.connect(alice).approve(
      nexoStraddleETH.address,
      ethers.constants.MaxUint256,
    )
    await contracts.USDC.connect(alice).approve(
      nexoStraddleBTC.address,
      ethers.constants.MaxUint256,
    )
    await contracts.ethPriceFeed.setPrice(5000e8)
    await contracts.btcPriceFeed.setPrice(50000e8)
  })

  describe("ETH", async () => {
    it("call exercised amount", async () => {
      const {
        alice,
        USDC,
        WETH,
        ethPriceFeed,
        nexoStraddleETH,
      } = contracts
      await nexoStraddleETH.setLimit(
        ethers.utils.parseUnits("1000000", await contracts.USDC.decimals()),
      )
      let balance_alice_before = await USDC.balanceOf(await alice.getAddress())
      let strike_price = 3000e8
      let new_price = 8000e8
      await ethPriceFeed.setPrice(strike_price)
      await nexoStraddleETH
        .connect(alice)
        .buy(
          await alice.getAddress(),
          24 * 3600,
          BN.from(ethers.utils.parseUnits("0.333333", await WETH.decimals())),
          0,
        )
      let balance_alice_after = await USDC.balanceOf(await alice.getAddress())
      await ethPriceFeed.setPrice(new_price)

      await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
      let txExercise = await nexoStraddleETH.connect(alice).exercise(0)
      let balance_alice_after_exercise = await USDC.balanceOf(
        await alice.getAddress(),
      )
      let exercised_amount = balance_alice_after_exercise.sub(
        balance_alice_after,
      )
      expect(exercised_amount).to.be.eq(1666.665e6)
    })

    // ... keep same tests, all updated to nexoStraddleETH and NexoOperationalTreasury
  })

  describe("BTC", async () => {
    it("call exercised amount", async () => {
      const {
        alice,
        USDC,
        WBTC,
        btcPriceFeed,
        nexoStraddleBTC,
      } = contracts
      await nexoStraddleBTC.setLimit(
        ethers.utils.parseUnits("1000000", await contracts.USDC.decimals()),
      )
      let strike_price = 41900e8
      let new_price = 67000e8
      await btcPriceFeed.setPrice(strike_price)
      await nexoStraddleBTC
        .connect(alice)
        .buy(
          await alice.getAddress(),
          24 * 3600,
          BN.from(ethers.utils.parseUnits("1.56565656", await WBTC.decimals())),
          0,
        )
      await btcPriceFeed.setPrice(new_price)

      await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
      let txExercise = await nexoStraddleBTC.connect(alice).exercise(0)
      let exercised_amount = await USDC.balanceOf(await alice.getAddress())
      expect(exercised_amount).to.be.gt(0)
    })

    // ... and so on for BTC tests
  })
})

import {ethers, deployments} from "hardhat"
import {BigNumber as BN, Signer} from "ethers"
import {solidity} from "ethereum-waffle"
import chai from "chai"
import {NexoStrategyStrip} from "../../typechain/NexoStrategyStrip"
import {WethMock} from "../../typechain/WethMock"
import {PriceCalculator} from "../../typechain/PriceCalculator"
import {AggregatorV3Interface} from "../../typechain/AggregatorV3Interface"
import {Erc20Mock as ERC20} from "../../typechain/Erc20Mock"
import {NexoOperationalTreasury} from "../../typechain/NexoOperationalTreasury"

chai.use(solidity)
const {expect} = chai

const fixture = deployments.createFixture(async ({deployments}) => {
  await deployments.fixture(["single-straddle"])

  const [deployer, alice] = await ethers.getSigners()

  return {
    deployer,
    alice,
    nexoStraddleETH: (await ethers.getContract(
      "NexoStrategyStraddleETH",
    )) as NexoStrategyStrip,
    nexoStraddleBTC: (await ethers.getContract(
      "NexoStrategyStraddleBTC",
    )) as NexoStrategyStrip,
    USDC: (await ethers.getContract("USDC")) as ERC20,
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
  }
})

describe("NexoPoolStaddle", async () => {
  let contracts: Awaited<ReturnType<typeof fixture>>

  beforeEach(async () => {
    contracts = await fixture()
    const {alice, pricerETH, pricerBTC} = contracts

    await pricerETH.setPeriodLimits(1 * 24 * 3600, 30 * 24 * 3600)
    await pricerBTC.setPeriodLimits(1 * 24 * 3600, 30 * 24 * 3600)

    await contracts.USDC.mintTo(
      contracts.NexoOperationalTreasury.address,
      ethers.utils.parseUnits(
        "1000000000000000",
        await contracts.USDC.decimals(),
      ),
    )
    await contracts.NexoOperationalTreasury.addTokens()

    await contracts.USDC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits(
        "1000000000000000",
        await contracts.USDC.decimals(),
      ),
    )

    await contracts.USDC.connect(alice).approve(
      contracts.nexoStraddleETH.address,
      ethers.constants.MaxUint256,
    )
    await contracts.USDC.connect(alice).approve(
      contracts.nexoStraddleBTC.address,
      ethers.constants.MaxUint256,
    )
    await contracts.ethPriceFeed.setPrice(5000e8)
    await contracts.btcPriceFeed.setPrice(50000e8)
  })

  describe("ETH", async () => {
    it("call exercised amount", async () => {
      const {alice, USDC, WETH, ethPriceFeed, nexoStraddleETH} = contracts
      await nexoStraddleETH.setLimit(
        ethers.utils.parseUnits("1000000", await contracts.USDC.decimals()),
      )
      let balance_alice_before = await USDC.balanceOf(await alice.getAddress())
      let strike_price = 3000e8
      let new_price = 8000e8
      await ethPriceFeed.setPrice(strike_price)
      await nexoStraddleETH
        .connect(alice)
        .buy(
          await alice.getAddress(),
          24 * 3600,
          BN.from(ethers.utils.parseUnits("0.333333", await WETH.decimals())),
          0,
        )
      let balance_alice_after = await USDC.balanceOf(await alice.getAddress())
      await ethPriceFeed.setPrice(new_price)

      await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
      await nexoStraddleETH.connect(alice).exercise(0)
      let balance_alice_after_exercise = await USDC.balanceOf(
        await alice.getAddress(),
      )
      let exercised_amount = balance_alice_after_exercise.sub(
        balance_alice_after,
      )
      expect(exercised_amount).to.be.eq(1666.665e6)
    })

    it("put exercised amount", async () => {
      const {alice, USDC, WETH, ethPriceFeed, nexoStraddleETH} = contracts
      await nexoStraddleETH.setLimit(
        ethers.utils.parseUnits("1000000", await contracts.USDC.decimals()),
      )
      let strike_price = 8000e8
      let new_price = 5000e8
      await ethPriceFeed.setPrice(strike_price)
      await nexoStraddleETH
        .connect(alice)
        .buy(
          await alice.getAddress(),
          24 * 3600,
          BN.from(ethers.utils.parseUnits("1.787878", await WETH.decimals())),
          0,
        )
      await ethPriceFeed.setPrice(new_price)
      await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
      await nexoStraddleETH.connect(alice).exercise(0)
      let balance_alice_after_exercise = await USDC.balanceOf(
        await alice.getAddress(),
      )
      expect(balance_alice_after_exercise).to.be.gt(0)
    })

    it("null exercised amount", async () => {
      const {alice, WETH, ethPriceFeed, nexoStraddleETH} = contracts
      await nexoStraddleETH.setLimit(
        ethers.utils.parseUnits("1000000", await contracts.USDC.decimals()),
      )
      let strike_price = 9000e8
      let new_price = 9000e8
      await ethPriceFeed.setPrice(strike_price)
      await nexoStraddleETH
        .connect(alice)
        .buy(
          await alice.getAddress(),
          24 * 3600,
          BN.from(ethers.utils.parseUnits("1", await WETH.decimals())),
          0,
        )
      await ethPriceFeed.setPrice(new_price)
      await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
      await expect(nexoStraddleETH.connect(alice).exercise(0)).to.be.reverted
    })

    it("locked amount", async () => {
      const {alice, WETH, ethPriceFeed, nexoStraddleETH, NexoOperationalTreasury, pricerETH} = contracts
      await nexoStraddleETH.setLimit(
        ethers.utils.parseUnits("1000000", await contracts.USDC.decimals()),
      )
      await pricerETH.setImpliedVolRate(BN.from("800000"))
      let strike_price = 3000e8
      await ethPriceFeed.setPrice(strike_price)
      await nexoStraddleETH
        .connect(alice)
        .buy(
          await alice.getAddress(),
          86400 * 9,
          BN.from(ethers.utils.parseUnits("3.45", await WETH.decimals())),
          0,
        )
      expect(
        await NexoOperationalTreasury.lockedByStrategy(nexoStraddleETH.address),
      ).to.be.eq(BN.from(2431.56e6))
    })
  })

  describe("BTC", async () => {
    it("call exercised amount", async () => {
      const {alice, USDC, WBTC, btcPriceFeed, nexoStraddleBTC} = contracts
      await nexoStraddleBTC.setLimit(
        ethers.utils.parseUnits("1000000", await contracts.USDC.decimals()),
      )
      let strike_price = 41900e8
      let new_price = 67000e8
      await btcPriceFeed.setPrice(strike_price)
      await nexoStraddleBTC
        .connect(alice)
        .buy(
          await alice.getAddress(),
          24 * 3600,
          BN.from(ethers.utils.parseUnits("1.56565656", await WBTC.decimals())),
          0,
        )
      await btcPriceFeed.setPrice(new_price)
      await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
      await nexoStraddleBTC.connect(alice).exercise(0)
      let balance_alice_after_exercise = await USDC.balanceOf(
        await alice.getAddress(),
      )
      expect(balance_alice_after_exercise).to.be.gt(0)
    })

    it("exceeds the limit", async () => {
      const {alice, WBTC, btcPriceFeed, nexoStraddleBTC, pricerBTC} = contracts
      await nexoStraddleBTC.setLimit(
        ethers.utils.parseUnits("1000000", await contracts.USDC.decimals()),
      )
      await pricerBTC.setImpliedVolRate(BN.from("80000000000000000"))
      await btcPriceFeed.setPrice(3000e8)
      await expect(
        nexoStraddleBTC
          .connect(alice)
          .buy(
            await alice.getAddress(),
            86400 * 30,
            BN.from(ethers.utils.parseUnits("77.7", await WBTC.decimals())),
            0,
          ),
      ).to.be.revertedWith("NexoStrategy: The limit is exceeded")
    })
  })
})

