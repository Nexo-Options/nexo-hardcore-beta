import {HardhatRuntimeEnvironment} from "hardhat/types"
import {NexoPool} from "../../typechain/NexoPool"
import {OptionsManager} from "../../typechain/OptionsManager"

const ETHIVRate = 7e11

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const NEXO = await get("NEXO")
  const USDC = await get("USDC")
  const WETH = await get("WETH")
  const WBTC = await get("WBTC")
  const BTCPriceProvider = await get("WBTCPriceProvider")
  const ETHPriceProvider = await get("ETHPriceProvider")

  const OptionsManager = await deploy("OptionsManager", {
    from: deployer,
    log: true,
  })

  await deploy("Exerciser", {
    from: deployer,
    log: true,
    args: [OptionsManager.address],
  })

  const WBTCStaking = await deploy("WBTCStaking", {
    contract: "NexoStaking",
    from: deployer,
    log: true,
    args: [NEXO.address, WBTC.address, "WBTC Staking", "WBTC S"],
  })

  const WETHStaking = await deploy("WETHStaking", {
    contract: "NexoStaking",
    from: deployer,
    log: true,
    args: [NEXO.address, WETH.address, "WBTC Staking", "WETH S"],
  })

  const USDCStaking = await deploy("USDCStaking", {
    contract: "NexoStaking",
    from: deployer,
    log: true,
    args: [NEXO.address, USDC.address, "USDC Staking", "USDC S"],
  })

  const NexoAtmCall_WETH = await deploy("NexoWETHCALL", {
    contract: "NexoCALL",
    from: deployer,
    log: true,
    args: [
      WETH.address,
      "Nexo ETH ATM Calls Pool",
      "ETHCALLSPOOL",
      OptionsManager.address,
      ethers.constants.AddressZero,
      WETHStaking.address,
      ETHPriceProvider.address,
    ],
  })

  const NexoAtmPut_WETH = await deploy("NexoWETHPUT", {
    contract: "NexoPUT",
    from: deployer,
    log: true,
    args: [
      USDC.address,
      "Nexo ETH ATM Puts Pool",
      "ETHPUTSPOOL",
      OptionsManager.address,
      ethers.constants.AddressZero,
      USDCStaking.address,
      ETHPriceProvider.address,
      18,
      6,
    ],
  })

  const NexoAtmCall_WBTC = await deploy("NexoWBTCCALL", {
    contract: "NexoCALL",
    from: deployer,
    log: true,
    args: [
      WBTC.address,
      "Nexo WBTC ATM Calls Pool",
      "WBTCCALLSPOOL",
      OptionsManager.address,
      ethers.constants.AddressZero,
      WBTCStaking.address,
      BTCPriceProvider.address,
    ],
  })

  const NexoAtmPut_WBTC = await deploy("NexoWBTCPUT", {
    contract: "NexoPUT",
    from: deployer,
    log: true,
    args: [
      USDC.address,
      "Nexo WBTC ATM Puts Pool",
      "WBTCPUTSPOOL",
      OptionsManager.address,
      ethers.constants.AddressZero,
      USDCStaking.address,
      BTCPriceProvider.address,
      8,
      6,
    ],
  })

  const optionsManagerInstance = (await ethers.getContract(
    "OptionsManager",
  )) as OptionsManager

  await optionsManagerInstance.grantRole(
    await optionsManagerInstance.NEXO_POOL_ROLE(),
    NexoAtmCall_WETH.address,
  )

  await optionsManagerInstance.grantRole(
    await optionsManagerInstance.NEXO_POOL_ROLE(),
    NexoAtmPut_WETH.address,
  )

  await optionsManagerInstance.grantRole(
    await optionsManagerInstance.NEXO_POOL_ROLE(),
    NexoAtmCall_WBTC.address,
  )

  await optionsManagerInstance.grantRole(
    await optionsManagerInstance.NEXO_POOL_ROLE(),
    NexoAtmPut_WBTC.address,
  )
}

deployment.tags = ["test", "base"]
deployment.dependencies = ["tokens"]
export default deployment
