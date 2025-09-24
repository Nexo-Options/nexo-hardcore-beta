import {ethers, deployments} from "hardhat"
import {Signer} from "ethers"
import {solidity} from "ethereum-waffle"
import chai from "chai"
import {Facade} from "../../typechain/Facade"
import {NexoPool} from "../../typechain/NexoPool"
import {WethMock} from "../../typechain/WethMock"
import {Erc20Mock as ERC20} from "../../typechain/Erc20Mock"
import {AggregatorV3Interface} from "../../typechain/AggregatorV3Interface"
import {Exerciser} from "../../typechain/Exerciser"
import {OptionsManager} from "../../typechain/OptionsManager"

chai.use(solidity)

describe("Exerciser", async () => {
  let facade: Facade
  let WBTC: ERC20
  let USDC: ERC20
  let WETH: WethMock
  let NEXO: ERC20
  let alice: Signer
  let NexoATMCALL_WETH: NexoPool
  let NexoATMPUT_WETH: NexoPool
  let ethPriceFeed: AggregatorV3Interface
  let exerciser: Exerciser
  let manager: OptionsManager

  beforeEach(async () => {
    await deployments.fixture(["test"])
    ;[, alice] = await ethers.getSigners()

    facade = (await ethers.getContract("Facade")) as Facade
    WBTC = (await ethers.getContract("WBTC")) as ERC20
    WETH = (await ethers.getContract("WETH")) as WethMock
    USDC = (await ethers.getContract("USDC")) as ERC20
    NEXO = (await ethers.getContract("NEXO")) as ERC20
    ethPriceFeed = (await ethers.getContract(
      "ETHPriceProvider",
    )) as AggregatorV3Interface

    NexoATMCALL_WETH = (await ethers.getContract("NexoWETHCALL")) as NexoPool
    NexoATMPUT_WETH = (await ethers.getContract("NexoWETHPUT")) as NexoPool
    manager = (await ethers.getContract("OptionsManager")) as OptionsManager
    exerciser = (await ethers.getContract("Exerciser")) as Exerciser

    const SELLER_ROLE = await NexoATMCALL_WETH.SELLER_ROLE()
    await NexoATMCALL_WETH.grantRole(SELLER_ROLE, facade.address)
    await NexoATMPUT_WETH.grantRole(SELLER_ROLE, facade.address)

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
      ethers.utils.parseUnits("1000000000000000", await USDC.decimals()),
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

  describe("exercise", () => {
    it("should exercise option", async () => {
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
      await ethPriceFeed.setPrice(3000e8)

      await manager.connect(alice).setApprovalForAll(exerciser.address, true)

      await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
      await ethers.provider.send("evm_mine", [])

      await exerciser.exercise(0)
    })
  })
})
