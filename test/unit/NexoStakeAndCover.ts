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
  await deployments.fixture(["stake-and-cover"])

  const [deployer, alice, piter] = await ethers.getSigners()

  return {
    deployer,
    alice,
    piter,
    USDC: (await ethers.getContract("USDC")) as ERC20,
    NEXO: (await ethers.getContract("NEXO")) as ERC20,
    NexoStakeAndCover: (await ethers.getContract(
      "NexoStakeAndCover",
    )) as NexoStakeAndCover,
  }
})

describe("NexoStakeAndCover", async () => {
  let contracts: Awaited<ReturnType<typeof fixture>>
  beforeEach(async () => {
    contracts = await fixture()
    const {alice, deployer, NEXO} = contracts

    const baseTokenAmount = ethers.utils.parseUnits(
      "10000000",
      await contracts.USDC.decimals(),
    )
    const nexoTokenAmount = ethers.utils.parseUnits(
      "100000000",
      await NEXO.decimals(),
    )

    await contracts.USDC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits(
        "1000000000000000",
        await contracts.USDC.decimals(),
      ),
    )
    await NEXO.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits("1000000000000000", await NEXO.decimals()),
    )
    contracts.NEXO.connect(alice).approve(
      contracts.NexoStakeAndCover.address,
      ethers.constants.MaxUint256,
    )
    contracts.USDC.connect(alice).approve(
      contracts.NexoStakeAndCover.address,
      ethers.constants.MaxUint256,
    )

    await contracts.USDC.mintTo(
      contracts.NexoStakeAndCover.address,
      baseTokenAmount,
    )
    await contracts.NEXO.mintTo(
      contracts.NexoStakeAndCover.address,
      nexoTokenAmount,
    )
    await contracts.NexoStakeAndCover.saveFreeTokens()
  })

  describe("Logic check", async () => {
    it("Should calculate intrinsic value correct", async () => {
      const {NexoStakeAndCover, USDC, NEXO} = contracts
      expect(
        (await NexoStakeAndCover.totalBalance())
          .div("1" + "0".repeat(await NEXO.decimals()))
          .div(
            (await USDC.balanceOf(NexoStakeAndCover.address)).div(
              "1" + "0".repeat(await USDC.decimals()),
            ),
          ),
      ).to.be.eq(BN.from(10))
    })

    describe("Claim", async () => {
      let USDCBalanceBeforeClaim: BN
      let NEXOBalanceBeforeClaim: BN
      let USDCBalanceAfterClaim: BN
      let NEXOBalanceAfterClaim: BN

      let USDCBalanceBeforeProvide: BN
      let NEXOBalanceBeforeProvide: BN
      let USDCBalanceAfterProvide: BN
      let NEXOBalanceAfterProvide: BN

      beforeEach(async () => {
        const {alice, NexoStakeAndCover, USDC, NEXO} = contracts
        USDCBalanceBeforeProvide = await USDC.balanceOf(
          NexoStakeAndCover.address,
        )
        NEXOBalanceBeforeProvide = await NexoStakeAndCover.totalBalance()
        await NexoStakeAndCover.connect(alice).provide(
          ethers.utils.parseUnits("1000000", await NEXO.decimals()),
        )
        USDCBalanceAfterProvide = await USDC.balanceOf(
          NexoStakeAndCover.address,
        )
        NEXOBalanceAfterProvide = await NexoStakeAndCover.totalBalance()
        await USDC.mintTo(
          contracts.NexoStakeAndCover.address,
          ethers.utils.parseUnits("100000", await USDC.decimals()),
        )
        USDCBalanceBeforeClaim = await USDC.balanceOf(await alice.getAddress())
        NEXOBalanceBeforeClaim = await NexoStakeAndCover.balanceOf(
          await alice.getAddress(),
        )

        await NexoStakeAndCover.connect(alice).claimProfit()

        USDCBalanceAfterClaim = await USDC.balanceOf(await alice.getAddress())
        NEXOBalanceAfterClaim = await NexoStakeAndCover.balanceOf(
          await alice.getAddress(),
        )
      })

      it("Should claim correct amount of USDC", async () => {
        expect(USDCBalanceAfterClaim.sub(USDCBalanceBeforeClaim)).to.be.eq(
          990099008,
        )
      })

      it("Should decrease NEXO balance for user", async () => {
        expect(NEXOBalanceBeforeClaim.sub(NEXOBalanceAfterClaim)).to.be.eq(
          BN.from("9803921559705882352941"),
        )
      })

      it("Should revert transcation when current balance <= start balance", async () => {
        expect(
          contracts.NexoStakeAndCover.connect(contracts.alice).claimProfit(),
        ).to.be.revertedWith("NexoStakeAndCover: The claimable profit is zero")
      })

      it("Should move the correct amount of USDC from user address to Insurance pool when he/she provide NEXO", async () => {
        expect(
          NEXOBalanceBeforeProvide.div(USDCBalanceBeforeProvide),
        ).to.be.eq(NEXOBalanceAfterProvide.div(USDCBalanceAfterProvide))
      })

      it("Should return the correct availableBalance", async () => {
        expect(await contracts.NexoStakeAndCover.availableBalance()).to.be.eq(
          BN.from("10199009900992"),
        )
      })

      it("Should return the correct shareOf", async () => {
        const {alice, NexoStakeAndCover, USDC} = contracts
        expect(
          await NexoStakeAndCover.shareOf(await alice.getAddress()),
        ).to.be.eq(ethers.utils.parseUnits("100000", await USDC.decimals()))
      })

      it("Should return the correct profitOf", async () => {
        expect(
          await contracts.NexoStakeAndCover.profitOf(
            await contracts.alice.getAddress(),
          ),
        ).to.be.eq(0)
      })

      it("Should revert withdraw NEXO transcation when withdrawEnabled = false ", async () => {
        expect(
          contracts.NexoStakeAndCover.connect(contracts.alice).withdraw(
            ethers.utils.parseUnits(
              "990196.078440294",
              await contracts.NEXO.decimals(),
            ),
          ),
        ).to.be.revertedWith(
          "NexoStakeAndCover: Withdrawals are currently disabled",
        )
      })

      it("Should withdraw NEXO/USDC from Insurance Pool when withdrawEnabled = true ", async () => {
        const {alice, deployer, NexoStakeAndCover, USDC, NEXO} = contracts
        await NexoStakeAndCover.connect(deployer).setWithdrawalsEnabled(true)
        let USDCBalanceBefore = await USDC.balanceOf(NexoStakeAndCover.address)
        let NEXOBalanceBefore = await NexoStakeAndCover.totalBalance()
        NexoStakeAndCover.connect(alice).withdraw(
          ethers.utils.parseUnits("990196.078440294", await NEXO.decimals()),
        )
        let USDCBalanceAfter = await USDC.balanceOf(NexoStakeAndCover.address)
        let NEXOBalanceAfter = await NexoStakeAndCover.totalBalance()

        expect(USDCBalanceBefore.sub(USDCBalanceAfter)).to.be.eq(
          ethers.utils.parseUnits("100000", await USDC.decimals()),
        )

        expect(NEXOBalanceBefore.sub(NEXOBalanceAfter)).to.be.eq(
          ethers.utils.parseUnits("990196.078440294", await NEXO.decimals()),
        )
      })

      it("Should withdraw USDC from Insurance Pool (deployer only)", async () => {
        const {alice, deployer, NexoStakeAndCover, USDC} = contracts
        await NexoStakeAndCover.connect(deployer).transfer(
          await alice.getAddress(),
          ethers.utils.parseUnits("10100000", await USDC.decimals()),
        )
        expect(await USDC.balanceOf(NexoStakeAndCover.address)).to.be.eq(
          ethers.utils.parseUnits("99009.900992", await USDC.decimals()),
        )
      })

      it("Should revert transcation when msg.sender try to change setWithdrawalsEnabled (msg.sender isn't owner)", async () => {
        expect(
          contracts.NexoStakeAndCover.connect(
            contracts.alice,
          ).setWithdrawalsEnabled(true),
        ).to.be.reverted
      })

      it("Should revert transcation when msg.sender try to withdraw USDC from Insurance Pool(msg.sender isn't owner)", async () => {
        expect(
          contracts.NexoStakeAndCover.connect(contracts.alice).transfer(
            await contracts.alice.getAddress(),
            ethers.utils.parseUnits("1", await contracts.USDC.decimals()),
          ),
        ).to.be.reverted
      })

      it("Should send half of NEXO balance from Alice to Piter and calculate correct new balanceOf and ShareOf", async () => {
        const {alice, piter, NexoStakeAndCover, NEXO, USDC} = contracts
        await NexoStakeAndCover.connect(alice).transferShare(
          await piter.getAddress(),
          BN.from("495098039220147000000000"),
        )

        expect(ethers.utils.parseUnits("50000", await USDC.decimals()))
          .to.be.eq(await NexoStakeAndCover.shareOf(await piter.getAddress()))
          .to.be.eq(await NexoStakeAndCover.shareOf(await alice.getAddress()))

        expect(BN.from("495098039220147000000000")).to.be.eq(
          await NexoStakeAndCover.balanceOf(await piter.getAddress()),
        )
        expect(BN.from("495098039220147117647059")).to.be.eq(
          await NexoStakeAndCover.balanceOf(await alice.getAddress()),
        )
      })

      it("Should revert claim transcation for Piter", async () => {
        const {alice, piter, NexoStakeAndCover, USDC} = contracts
        await NexoStakeAndCover.connect(alice).transferShare(
          await piter.getAddress(),
          BN.from("495098039220147000000000"),
        )
        expect(
          NexoStakeAndCover.connect(piter).claimProfit(),
        ).to.be.revertedWith("NexoStakeAndCover: The claimable profit is zero")
        expect(
          await ethers.utils.parseUnits("50000", await USDC.decimals()),
        ).to.be.eq(
          await NexoStakeAndCover.startBalance(await alice.getAddress()),
        )
      })

      it("Should claim USDC reward before provide()", async () => {
        const {alice, NexoStakeAndCover, NEXO, USDC} = contracts
        await USDC.mintTo(
          NexoStakeAndCover.address,
          ethers.utils.parseUnits("100000", await USDC.decimals()),
        )
        let before = await USDC.balanceOf(await alice.getAddress())
        await NexoStakeAndCover.connect(alice).provide(
          ethers.utils.parseUnits("495098", await NEXO.decimals()),
        )
        let after = await USDC.balanceOf(await alice.getAddress())
        expect(BN.from("50490239666").sub(before.sub(after))).to.be.eq(
          BN.from("980487331"),
        )
        expect(
          await NexoStakeAndCover.profitOf(await alice.getAddress()),
        ).to.be.eq(0)
      })
    })
  })
})
