// import {ethers, deployments} from "hardhat"
// import {BigNumber as BN, Signer} from "ethers"
// import {solidity} from "ethereum-waffle"
// import chai from "chai"
// import {NexoPool} from "../../typechain/NexoPool"
// import {NexoOptions} from "../../typechain/NexoOptions"
// import {PriceCalculator} from "../../typechain/PriceCalculator"
// import {NexoStaking} from "../../typechain/NexoStaking"
// import {Erc20Mock} from "../../typechain/Erc20Mock"
//
// chai.use(solidity)
// const {expect} = chai
// const ONE_DAY = BN.from(86400)
//
// describe("Options", async () => {
//   let nexoPoolWBTC: NexoPool
//   let nexoPoolUSDC: NexoPool
//   let nexoStakingWBTC: NexoStaking
//   let nexoStakingUSDC: NexoStaking
//   let nexoOptions: NexoOptions
//   let priceCalculator: PriceCalculator
//   let fakeNexo: Erc20Mock
//   let fakeUSDC: Erc20Mock
//   let fakeWBTC: Erc20Mock
//   let deployer: Signer
//   let alice: Signer
//
//   beforeEach(async () => {
//     await deployments.fixture()
//     ;[deployer, alice] = await ethers.getSigners()
//
//     nexoPoolWBTC = (await ethers.getContract("NexoWBTCPool")) as NexoPool
//     nexoPoolUSDC = (await ethers.getContract("NexoUSDCPool")) as NexoPool
//     nexoStakingWBTC = (await ethers.getContract("WBTCStaking")) as NexoStaking
//     nexoStakingUSDC = (await ethers.getContract("USDCStaking")) as NexoStaking
//     priceCalculator = (await ethers.getContract(
//       "WBTCPriceCalculator",
//     )) as PriceCalculator
//     nexoOptions = (await ethers.getContract("WBTCOptions")) as NexoOptions
//     fakeNexo = (await ethers.getContract("NEXO")) as Erc20Mock
//     fakeUSDC = (await ethers.getContract("USDC")) as Erc20Mock
//     fakeWBTC = (await ethers.getContract("WBTC")) as Erc20Mock
//
//     await fakeNexo.mintTo(
//       await alice.getAddress(),
//       ethers.utils.parseUnits("888000", await fakeNexo.decimals()),
//     )
//
//     await fakeUSDC.mintTo(
//       await alice.getAddress(),
//       ethers.utils.parseUnits("100000000", await fakeUSDC.decimals()),
//     )
//
//     await fakeWBTC.mintTo(
//       await alice.getAddress(),
//       ethers.utils.parseUnits("1000000", await fakeWBTC.decimals()),
//     )
//
//     await fakeWBTC
//       .connect(alice)
//       .approve(nexoPoolWBTC.address, ethers.constants.MaxUint256)
//
//     await fakeWBTC
//       .connect(alice)
//       .approve(nexoOptions.address, ethers.constants.MaxUint256)
//
//     await nexoPoolWBTC
//       .connect(alice)
//       .provideFrom(
//         await alice.getAddress(),
//         ethers.utils.parseUnits("1000", await fakeWBTC.decimals()),
//         true,
//         ethers.utils.parseUnits("1000", await fakeWBTC.decimals()),
//       )
//
//     await fakeUSDC
//       .connect(alice)
//       .approve(nexoPoolUSDC.address, ethers.constants.MaxUint256)
//
//     await fakeUSDC
//       .connect(alice)
//       .approve(nexoOptions.address, ethers.constants.MaxUint256)
//
//     await nexoPoolUSDC
//       .connect(alice)
//       .provideFrom(
//         await alice.getAddress(),
//         ethers.utils.parseUnits("10000000", await fakeUSDC.decimals()),
//         true,
//         ethers.utils.parseUnits("10000000", await fakeUSDC.decimals()),
//       )
//   })
//   interface Fees {
//     settlementFee: BN
//     premium: BN
//   }
//   let amount: BN
//   let strike: BN
//   let calculateTotalPremium: Fees
//   let deployerWBTCBalanceBefore: BN
//   let deployerUSDCBalanceBefore: BN
//   let aliceWBTCBalanceBefore: BN
//   let aliceUSDCBalanceBefore: BN
//   let nexoPoolWBTCBalanceBefore: BN
//   let lockedAmountBefore: BN
//   let hedgePremium: BN
//   let hedgeFee: BN
//   let amountToLock: BN
//   let nexoStakingUSDCBalanceBefore: BN
//
//   describe("Buying a call option with lots in the staking pool", async () => {
//     beforeEach(async () => {
//       amount = ethers.utils.parseUnits("15", await fakeWBTC.decimals())
//       strike = BN.from(50000e8)
//       aliceWBTCBalanceBefore = await fakeWBTC.balanceOf(
//         await alice.getAddress(),
//       )
//       nexoPoolWBTCBalanceBefore = await fakeWBTC.balanceOf(
//         nexoPoolWBTC.address,
//       )
//       deployerWBTCBalanceBefore = await fakeWBTC.balanceOf(
//         await deployer.getAddress(),
//       )
//       lockedAmountBefore = await nexoPoolWBTC.lockedAmount()
//       calculateTotalPremium = await priceCalculator.calculateTotalPremium(ONE_DAY, amount, strike, 2)
//       await fakeNexo
//         .connect(alice)
//         .approve(nexoStakingWBTC.address, ethers.constants.MaxUint256)
//       await nexoStakingWBTC.connect(alice).buy(1)
//
//       await nexoOptions
//         .connect(alice)
//         .createFor(
//           await alice.getAddress(),
//           ONE_DAY,
//           amount,
//           strike,
//           BN.from(2),
//         )
//       const poolTotalBalance = await nexoPoolWBTC.totalBalance()
//       const poolHedgedBalance = await nexoPoolWBTC.hedgedBalance()
//       const poolHedgeFeeRate = await nexoPoolWBTC.hedgeFeeRate()
//
//       hedgePremium = calculateTotalPremium.premium.mul(poolHedgedBalance).div(poolTotalBalance)
//
//       hedgeFee = hedgePremium.mul(poolHedgeFeeRate).div(BN.from(100))
//     })
//     it("should create the call option", async () => {
//       const option = await nexoOptions.options(BN.from(0))
//       expect(option.state).to.eq(BN.from(1))
//       expect(option.strike).to.eq(strike)
//       expect(option.optionType).to.eq(BN.from(2))
//       expect(option.lockedLiquidityID).to.eq(BN.from(0))
//     })
//     it("should decrease Alice's balance by the settlement fee and premium", async () => {
//       expect(
//         aliceWBTCBalanceBefore.sub(calculateTotalPremium.settlementFee).sub(calculateTotalPremium.premium),
//       ).to.eq(await fakeWBTC.balanceOf(await alice.getAddress()))
//     })
//     it("should add the premium and subtract the hedge fee from the NexoPool", async () => {
//       expect(nexoPoolWBTCBalanceBefore.add(calculateTotalPremium.premium).sub(hedgeFee)).to.eq(
//         await fakeWBTC.balanceOf(nexoPoolWBTC.address),
//       )
//     })
//     it("should increase the balance of NexoStaking by the settlement fee", async () => {
//       expect(await fakeWBTC.balanceOf(nexoStakingWBTC.address)).to.eq(
//         calculateTotalPremium.settlementFee,
//       )
//     })
//     it("should increase the lockedAmount in the Liquidity Pool", async () => {
//       expect(lockedAmountBefore.add(amount)).to.eq(
//         await nexoPoolWBTC.lockedAmount(),
//       )
//     })
//     it("should add the locked liquidity to LockedLiquidity[] in the LP", async () => {
//       const ll = await nexoPoolWBTC.lockedLiquidity(BN.from(0))
//       expect(ll.amount).to.equal(amount)
//       expect(ll.hedgePremium).to.equal(hedgePremium.sub(hedgeFee))
//       expect(ll.unhedgePremium).to.equal(BN.from(0))
//       expect(ll.locked).to.equal(true)
//     })
//   })
//   describe("Buying a call option with no lots in the staking pool", async () => {
//     beforeEach(async () => {
//       amount = ethers.utils.parseUnits("15", await fakeWBTC.decimals())
//       strike = BN.from(50000e8)
//       calculateTotalPremium = await priceCalculator.calculateTotalPremium(ONE_DAY, amount, strike, 2)
//
//       await nexoOptions
//         .connect(alice)
//         .createFor(
//           await alice.getAddress(),
//           ONE_DAY,
//           amount,
//           strike,
//           BN.from(2),
//         )
//     })
//     it("should send the hedge fee and settlement fee to the deployer address", async () => {
//       expect(
//         deployerWBTCBalanceBefore.add(hedgeFee).add(calculateTotalPremium.settlementFee),
//       ).to.eq(await fakeWBTC.balanceOf(await deployer.getAddress()))
//     })
//   })
//   describe("Buying a put option with lots in the staking pool", async () => {
//     beforeEach(async () => {
//       await fakeNexo
//         .connect(alice)
//         .approve(nexoStakingUSDC.address, ethers.constants.MaxUint256)
//       await nexoStakingUSDC.connect(alice).buy(1)
//       amount = ethers.utils.parseUnits("15", await fakeWBTC.decimals())
//       strike = BN.from(50000e8)
//       aliceUSDCBalanceBefore = await fakeUSDC.balanceOf(
//         await alice.getAddress(),
//       )
//       nexoStakingUSDCBalanceBefore = await fakeUSDC.balanceOf(
//         nexoStakingUSDC.address,
//       )
//       lockedAmountBefore = await nexoPoolUSDC.lockedAmount()
//       calculateTotalPremium = await priceCalculator.calculateTotalPremium(ONE_DAY, amount, strike, 1)
//
//       await nexoOptions
//         .connect(alice)
//         .createFor(
//           await alice.getAddress(),
//           ONE_DAY,
//           amount,
//           strike,
//           BN.from(1),
//         )
//
//       amountToLock = amount
//         .mul(strike)
//         .mul(BN.from(10).pow(0)) // STABLE_TOKEN_DECIMALS
//         .div(BN.from(10).pow(2)) // BASE_TOKEN_DECIMALS
//         .div(BN.from(10).pow(8)) // PRICE_DECIMALS
//     })
//     it("should create the put option", async () => {
//       const option = await nexoOptions.options(BN.from(0))
//       expect(option.state).to.eq(BN.from(1))
//       expect(option.strike).to.eq(strike)
//       expect(option.optionType).to.eq(BN.from(1))
//       expect(option.lockedLiquidityID).to.eq(BN.from(0))
//     })
//     it("should decrease Alice's balance by the settlement fee and premium", async () => {
//       expect(
//         aliceUSDCBalanceBefore.sub(calculateTotalPremium.settlementFee).sub(calculateTotalPremium.premium),
//       ).to.eq(await fakeUSDC.balanceOf(await alice.getAddress()))
//     })
//     it("should increase the balance of the USDC Staking Contract by the settlement fee", async () => {
//       expect(nexoStakingUSDCBalanceBefore.add(calculateTotalPremium.settlementFee)).to.eq(
//         await fakeUSDC.balanceOf(nexoStakingUSDC.address),
//       )
//     })
//     it("should increase the lockedAmount in the Liquidity Pool", async () => {
//       expect(lockedAmountBefore.add(amountToLock)).to.eq(
//         await nexoPoolUSDC.lockedAmount(),
//       )
//     })
//     it("should add the locked liquidity to LockedLiquidity[] in the LP", async () => {
//       const ll = await nexoPoolUSDC.lockedLiquidity(BN.from(0))
//       expect(ll.amount).to.equal(amountToLock)
//       // TODO - verify the premium
//       // expect(ll.hedgePremium).to.equal(BN.from(0))
//       // expect(ll.unhedgePremium).to.equal(BN.from(0))
//       expect(ll.locked).to.equal(true)
//     })
//   })
//   describe("Buying a put option with no lots in the staking pool", async () => {
//     beforeEach(async () => {
//       deployerUSDCBalanceBefore = await fakeUSDC.balanceOf(
//         await deployer.getAddress(),
//       )
//       amount = ethers.utils.parseUnits("15", await fakeWBTC.decimals())
//       strike = BN.from(50000e8)
//       calculateTotalPremium = await priceCalculator.calculateTotalPremium(ONE_DAY, amount, strike, 1)
//
//       await nexoOptions
//         .connect(alice)
//         .createFor(
//           await alice.getAddress(),
//           ONE_DAY,
//           amount,
//           strike,
//           BN.from(1),
//         )
//       const poolTotalBalance = await nexoPoolWBTC.totalBalance()
//       const poolHedgedBalance = await nexoPoolWBTC.hedgedBalance()
//       const poolHedgeFeeRate = await nexoPoolWBTC.hedgeFeeRate()
//
//       hedgePremium = calculateTotalPremium.premium.mul(poolHedgedBalance).div(poolTotalBalance)
//
//       hedgeFee = hedgePremium.mul(poolHedgeFeeRate).div(BN.from(100))
//     })
//     it("should send the hedge fee and settlement fee to the deployer address", async () => {
//       // TODO verify there is no fee
//       expect(
//         deployerUSDCBalanceBefore.add(calculateTotalPremium.settlementFee).add(hedgeFee),
//       ).to.eq(await fakeUSDC.balanceOf(await deployer.getAddress()))
//     })
//   })
//   xdescribe("Exercising a call option", async () => {})
//   xdescribe("Exercising a put option", async () => {})
//   xdescribe("Expiring a call option", async () => {})
//   xdescribe("Expiring a put option", async () => {})
// })
