import {ethers, deployments, timeAndMine} from "hardhat"
import {BigNumber as BN} from "ethers"
import {solidity} from "ethereum-waffle"
import chai from "chai"
import {Erc20Mock as ERC20} from "../../typechain/Erc20Mock"
import {NexoOperationalTreasury} from "../../typechain/NexoOperationalTreasury"
import {NexoStakeAndCover} from "../../typechain/NexoStakeAndCover"

chai.use(solidity)
const {expect} = chai

const fixture = deployments.createFixture(async ({deployments}) => {
  await deployments.fixture(["operational-treasury"])

  const [deployer, alice] = await ethers.getSigners()

  return {
    deployer,
    alice,
    USDC: (await ethers.getContract("USDC")) as ERC20,
    NEXO: (await ethers.getContract("NEXO")) as ERC20,
    NexoOperationalTreasury: (await ethers.getContract(
      "NexoOperationalTreasury",
    )) as NexoOperationalTreasury,
    NexoStakeAndCover: (await ethers.getContract(
      "NexoStakeAndCover",
    )) as NexoStakeAndCover,
  }
})

describe("NexoOperationalTreasury", async () => {
  let contracts: Awaited<ReturnType<typeof fixture>>
  const insuranceAmount = ethers.utils.parseUnits("900000", 6)
  const stakingAmount = ethers.utils.parseUnits("90000000", 18)

  const getPoolState = () =>
    Promise.all([
      contracts.NexoOperationalTreasury.totalBalance(),
      contracts.NexoOperationalTreasury.lockedPremium(),
      contracts.NexoOperationalTreasury.totalLocked(),
      contracts.USDC.balanceOf(contracts.NexoOperationalTreasury.address),
    ]).then(([totalBalance, lockedPremium, totalLocked, realBalance]) => ({
      totalBalance,
      lockedPremium,
      totalLocked,
      realBalance,
    }))

  beforeEach(async () => {
    contracts = await fixture()
    const {alice, NexoStakeAndCover} = contracts

    await contracts.USDC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits(
        "1000000000000000",
        await contracts.USDC.decimals(),
      ),
    )

    await contracts.NEXO.mintTo(NexoStakeAndCover.address, stakingAmount)
    await contracts.USDC.mintTo(NexoStakeAndCover.address, insuranceAmount)
    await NexoStakeAndCover.saveFreeTokens()
  })

  describe("constructor", () => {})

  describe("withdraw", () => {})

  describe("replenish, withdraw", async () => {
    const startBalance = ethers.utils.parseUnits("100000", 6)
    const startHBalance = ethers.utils.parseUnits("10000000", 18)
    beforeEach(async () => {
      await contracts.USDC.mintTo(
        contracts.NexoOperationalTreasury.address,
        startBalance,
      )
      await contracts.NexoOperationalTreasury.addTokens()
      await contracts.NexoOperationalTreasury.grantRole(
        await contracts.NexoOperationalTreasury.STRATEGY_ROLE(),
        await contracts.deployer.getAddress(),
      )
    })

    it("Should send USDC from InsurancePool when currentBalance < startBalance", async () => {
      const {NexoOperationalTreasury, deployer, USDC} = contracts
      const premium = ethers.utils.parseUnits("10000", 6)
      const lockAmount = ethers.utils.parseUnits("10000", 6)
      const expiration = Math.floor(Date.now() / 1000) + 24 * 3600
      const profit = ethers.utils.parseUnits("70000", 6)

      await USDC.mintTo(NexoOperationalTreasury.address, premium)
      await NexoOperationalTreasury.lockLiquidityFor(
        await deployer.getAddress(),
        lockAmount,
        expiration,
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance.add(premium),
        lockedPremium: premium,
        totalLocked: lockAmount,
        realBalance: startBalance.add(premium),
      })

      await NexoOperationalTreasury.payOff(
        0,
        profit,
        await deployer.getAddress(),
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance.add(premium).sub(profit),
        lockedPremium: BN.from(0),
        totalLocked: BN.from(0),
        realBalance: startBalance.add(premium).sub(profit),
      })

      await NexoOperationalTreasury.connect(deployer).replenish()

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance,
        lockedPremium: BN.from(0),
        totalLocked: BN.from(0),
        realBalance: startBalance,
      })
    })

    it("Should withdraw USDC", async () => {
      const {
        NexoOperationalTreasury,
        NexoStakeAndCover,
        deployer,
        USDC,
      } = contracts
      const premium = ethers.utils.parseUnits("10000", 6)
      const lockAmount = ethers.utils.parseUnits("10000", 6)
      const expiration = Math.floor(Date.now() / 1000) + 24 * 3600

      await USDC.mintTo(NexoOperationalTreasury.address, premium)
      await NexoOperationalTreasury.lockLiquidityFor(
        await deployer.getAddress(),
        lockAmount,
        expiration,
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance.add(premium),
        lockedPremium: premium,
        totalLocked: lockAmount,
        realBalance: startBalance.add(premium),
      })

      await timeAndMine.setTime(expiration + 1)
      await NexoOperationalTreasury.unlock(0)

      await NexoOperationalTreasury.connect(deployer).withdraw(
        NexoStakeAndCover.address,
        premium,
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance,
        lockedPremium: BN.from(0),
        totalLocked: BN.from(0),
        realBalance: startBalance,
      })
    })
  })

  describe("lockLiquidityFor", () => {
    const startBalance = ethers.utils.parseUnits("100000", 6)
    beforeEach(async () => {
      await contracts.USDC.mintTo(
        contracts.NexoOperationalTreasury.address,
        startBalance,
      )
      await contracts.NexoOperationalTreasury.addTokens()
      await contracts.NexoOperationalTreasury.grantRole(
        await contracts.NexoOperationalTreasury.STRATEGY_ROLE(),
        await contracts.deployer.getAddress(),
      )
    })

    it("should lock liquidity correctly", async () => {
      const {NexoOperationalTreasury, deployer, USDC} = contracts
      const premium = ethers.utils.parseUnits("100", 6)
      const lockAmount = ethers.utils.parseUnits("1000", 6)
      const expiration = Math.floor(Date.now() / 1000) + 24 * 3600

      await USDC.mintTo(NexoOperationalTreasury.address, premium)
      await NexoOperationalTreasury.lockLiquidityFor(
        await deployer.getAddress(),
        lockAmount,
        expiration,
      )
      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance.add(premium),
        lockedPremium: premium,
        totalLocked: lockAmount,
        realBalance: startBalance.add(premium),
      })
    })
  })

  describe("unlock", () => {
    const startBalance = ethers.utils.parseUnits("100000", 6)
    beforeEach(async () => {
      await contracts.USDC.mintTo(
        contracts.NexoOperationalTreasury.address,
        startBalance,
      )
      await contracts.NexoOperationalTreasury.addTokens()
      await contracts.NexoOperationalTreasury.grantRole(
        await contracts.NexoOperationalTreasury.STRATEGY_ROLE(),
        await contracts.deployer.getAddress(),
      )
    })

    it("should unlock liquidity correctly", async () => {
      const {NexoOperationalTreasury, deployer, USDC} = contracts
      const premium = ethers.utils.parseUnits("100", 6)
      const lockAmount = ethers.utils.parseUnits("1000", 6)
      const expiration = Math.floor(Date.now() / 1000) + 24 * 3600

      await USDC.mintTo(NexoOperationalTreasury.address, premium)
      await NexoOperationalTreasury.lockLiquidityFor(
        await deployer.getAddress(),
        lockAmount,
        expiration,
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance.add(premium),
        lockedPremium: premium,
        totalLocked: lockAmount,
        realBalance: startBalance.add(premium),
      })

      await timeAndMine.setTime(expiration + 1)
      await NexoOperationalTreasury.unlock(0)

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance.add(premium),
        lockedPremium: BN.from(0),
        totalLocked: BN.from(0),
        realBalance: startBalance.add(premium),
      })
    })
  })

  describe("payOff", () => {
    const startBalance = ethers.utils.parseUnits("100000", 6)
    beforeEach(async () => {
      await contracts.USDC.mintTo(
        contracts.NexoOperationalTreasury.address,
        startBalance,
      )
      await contracts.NexoOperationalTreasury.addTokens()
      await contracts.NexoOperationalTreasury.grantRole(
        await contracts.NexoOperationalTreasury.STRATEGY_ROLE(),
        await contracts.deployer.getAddress(),
      )
    })

    it("should set all balances correctly", async () => {
      const {NexoOperationalTreasury, deployer, USDC} = contracts
      const premium = ethers.utils.parseUnits("100", 6)
      const lockAmount = ethers.utils.parseUnits("1000", 6)
      const expiration = Math.floor(Date.now() / 1000) + 24 * 3600
      const profit = ethers.utils.parseUnits("1300", 6)

      await USDC.mintTo(NexoOperationalTreasury.address, premium)
      await NexoOperationalTreasury.lockLiquidityFor(
        await deployer.getAddress(),
        lockAmount,
        expiration,
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance.add(premium),
        lockedPremium: premium,
        totalLocked: lockAmount,
        realBalance: startBalance.add(premium),
      })

      await NexoOperationalTreasury.payOff(
        0,
        profit,
        await deployer.getAddress(),
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance.add(premium).sub(profit),
        lockedPremium: BN.from(0),
        totalLocked: BN.from(0),
        realBalance: startBalance.add(premium).sub(profit),
      })
    })

    it("should set all balances correctly (insurance)", async () => {
      const {NexoOperationalTreasury, deployer, USDC} = contracts
      const premium = ethers.utils.parseUnits("35000", 6)
      const lockAmount = ethers.utils.parseUnits("70000", 6)
      const expiration = Math.floor(Date.now() / 1000) + 24 * 3600
      const profit = ethers.utils.parseUnits("170000", 6)

      await USDC.mintTo(NexoOperationalTreasury.address, premium)
      await NexoOperationalTreasury.lockLiquidityFor(
        await deployer.getAddress(),
        lockAmount,
        expiration,
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance.add(premium),
        lockedPremium: premium,
        totalLocked: lockAmount,
        realBalance: startBalance.add(premium),
      })

      expect(
        await USDC.balanceOf(contracts.NexoStakeAndCover.address),
      ).to.be.eq(insuranceAmount)
      await NexoOperationalTreasury.payOff(
        0,
        profit,
        await deployer.getAddress(),
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: startBalance,
        lockedPremium: BN.from(0),
        totalLocked: BN.from(0),
        realBalance: startBalance,
      })

      expect(
        await USDC.balanceOf(contracts.NexoStakeAndCover.address),
      ).to.be.eq(insuranceAmount.add(premium).sub(profit))
    })
  })

  describe("addTokens", () => {
    it("should save free liquidity to totalBalance", async () => {
      const provideAmount = ethers.utils.parseUnits("100000", 6)

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: BN.from(0),
        lockedPremium: BN.from(0),
        totalLocked: BN.from(0),
        realBalance: BN.from(0),
      })

      await contracts.USDC.mintTo(
        contracts.NexoOperationalTreasury.address,
        provideAmount,
      )

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: BN.from(0),
        lockedPremium: BN.from(0),
        totalLocked: BN.from(0),
        realBalance: provideAmount,
      })

      await contracts.NexoOperationalTreasury.addTokens()

      expect(await getPoolState()).to.be.deep.eq({
        totalBalance: provideAmount,
        lockedPremium: BN.from(0),
        totalLocked: BN.from(0),
        realBalance: provideAmount,
      })
    })
  })
})
