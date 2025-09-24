import {ethers, deployments} from "hardhat"
import {BigNumber as BN, Signer} from "ethers"
import {solidity} from "ethereum-waffle"
import chai from "chai"
import {Facade} from "../../typechain/Facade"
import {NexoPool} from "../../typechain/NexoPool"
import {WethMock} from "../../typechain/WethMock"
import {Erc20Mock as ERC20} from "../../typechain/Erc20Mock"
import {AggregatorV3Interface} from "../../typechain/AggregatorV3Interface"
import {OptionsManager} from "../../typechain/OptionsManager"

chai.use(solidity)
const {expect} = chai
const ONE_DAY = BN.from(86400)
const optionType = {
  PUT: 1,
  CALL: 2,
}

describe("Facade", async () => {
  let facade: Facade
  let WBTC: ERC20
  let USDC: ERC20
  let WETH: WethMock
  let alice: Signer
  let NexoATMCALL_WETH: NexoPool
  let NexoATMPUT_WETH: NexoPool
  let ethPriceFeed: AggregatorV3Interface
  let manager: OptionsManager

  beforeEach(async () => {
    await deployments.fixture(["test"])
    ;[, alice] = await ethers.getSigners()

    facade = (await ethers.getContract("Facade")) as Facade
    WBTC = (await ethers.getContract("WBTC")) as ERC20
    WETH = (await ethers.getContract("WETH")) as WethMock
    USDC = (await ethers.getContract("USDC")) as ERC20
    ethPriceFeed = (await ethers.getContract(
      "ETHPriceProvider",
    )) as AggregatorV3Interface

    NexoATMCALL_WETH = (await ethers.getContract("NexoWETHCALL")) as NexoPool
    NexoATMPUT_WETH = (await ethers.getContract("NexoWETHPUT")) as NexoPool
    manager = (await ethers.getContract("OptionsManager")) as OptionsManager

    const SELLER_ROLE = await NexoATMCALL_WETH.SELLER_ROLE()
    NexoATMCALL_WETH.grantRole(SELLER_ROLE, facade.address)
    NexoATMPUT_WETH.grantRole(SELLER_ROLE, facade.address)

    await WETH.connect(alice).deposit({value: ethers.utils.parseUnits("100")})

    await WBTC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits("1000000", await WBTC.decimals()),
    )

    await WETH.connect(alice).approve(
      NexoATMCALL_WETH.address,
      ethers.constants.MaxUint256,
    )

    await USDC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits("1000000", await USDC.decimals()),
    )

    await USDC.connect(alice).approve(
      facade.address,
      ethers.constants.MaxUint256,
    )

    await USDC.connect(alice).approve(
      NexoATMPUT_WETH.address,
      ethers.constants.MaxUint256,
    )
  })

  describe("createOption", () => {
    it("should create call options", async () => {
      await facade
        .connect(alice)
        .provideEthToPool(NexoATMCALL_WETH.address, true, 0, {
          value: ethers.utils.parseEther("10"),
        })
      await facade
        .connect(alice)
        .createOption(
          NexoATMCALL_WETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address, WETH.address],
          ethers.constants.MaxUint256,
        )
      await ethPriceFeed.setPrice(3000e8)
      await NexoATMCALL_WETH.connect(alice).exercise(0)
    })

    it("should create put options", async () => {
      await NexoATMPUT_WETH.connect(alice).provideFrom(
        await alice.getAddress(),
        "10000000000",
        true,
        0,
      )

      await facade
        .connect(alice)
        .createOption(
          NexoATMPUT_WETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address],
          ethers.constants.MaxUint256,
        )
      await ethPriceFeed.setPrice(2000e8)
      await NexoATMPUT_WETH.connect(alice).exercise(0)
    })
  })

  describe("provideEthToPool", () => {
    it("should provide ETH to pool (hedged)", async () => {
      await facade
        .connect(alice)
        .provideEthToPool(NexoATMCALL_WETH.address, true, 0, {
          value: ethers.utils.parseEther("10"),
        })
    })
    it("should provide ETH to pool (unhedged)", async () => {
      await facade
        .connect(alice)
        .provideEthToPool(NexoATMCALL_WETH.address, false, 0, {
          value: ethers.utils.parseEther("10"),
        })
    })
  })

  describe("exercise (for GSN)", () => {
    it("should exercise user's option", async () => {
      await facade.provideEthToPool(NexoATMCALL_WETH.address, true, 0, {
        value: ethers.utils.parseEther("10"),
      })
      await facade
        .connect(alice)
        .createOption(
          NexoATMCALL_WETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address, WETH.address],
          ethers.constants.MaxUint256,
        )
      await manager.connect(alice).setApprovalForAll(facade.address, true)
      await ethPriceFeed.setPrice(3000e8)
      await expect(facade.exercise(0)).to.be.revertedWith(
        "Facade Error: _msgSender is not eligible to exercise the option",
      )
      await facade.connect(alice).exercise(0)
    })
  })
})
