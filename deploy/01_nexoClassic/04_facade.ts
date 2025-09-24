import {HardhatRuntimeEnvironment} from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const WETH = await get("WETH")
  const OptionsManager = await get("OptionsManager")
  const uniswapRouter = await get("UniswapRouter")

  const Facade = await deploy("Facade", {
    from: deployer,
    log: true,
    args: [
      WETH.address,
      uniswapRouter.address,
      OptionsManager.address,
      "0xAa3E82b4c4093b4bA13Cb5714382C99ADBf750cA",
    ],
  })

  await execute(
    "Facade",
    {from: deployer, log: true},
    "poolApprove",
    (await get("NexoWETHCALL")).address,
  )

  await execute(
    "Facade",
    {from: deployer, log: true},
    "poolApprove",
    (await get("NexoWETHPUT")).address,
  )

  await execute(
    "Facade",
    {from: deployer, log: true},
    "poolApprove",
    (await get("NexoWBTCCALL")).address,
  )

  await execute(
    "Facade",
    {from: deployer, log: true},
    "poolApprove",
    (await get("NexoWBTCPUT")).address,
  )
}

deployment.tags = ["test", "facade"]
deployment.dependencies = ["uni"]

export default deployment
