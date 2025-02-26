import {
  IOSConfig,
  ConfigPlugin,
  withXcodeProject,
  XcodeProject,
  WarningAggregator,
} from 'expo/config-plugins';

import type { PluginConfigType } from './pluginConfig';

const { createBuildPodfilePropsConfigPlugin } = IOSConfig.BuildProperties;

export const withIosBuildProperties = createBuildPodfilePropsConfigPlugin<PluginConfigType>(
  [
    {
      propName: 'newArchEnabled',
      propValueGetter: (config) => {
        if (config.ios?.newArchEnabled !== undefined) {
          WarningAggregator.addWarningIOS(
            'withIosBuildProperties',
            'ios.newArchEnabled is deprecated, use app config `newArchEnabled` instead.',
            'https://docs.expo.dev/versions/latest/config/app/#newarchenabled'
          );
        }
        return config.ios?.newArchEnabled?.toString();
      },
    },
    {
      propName: 'ios.useFrameworks',
      propValueGetter: (config) => config.ios?.useFrameworks,
    },
    {
      propName: 'EX_DEV_CLIENT_NETWORK_INSPECTOR',
      propValueGetter: (config) => (config.ios?.networkInspector ?? true).toString(),
    },
    {
      propName: 'apple.extraPods',
      propValueGetter: (config) => JSON.stringify(config.ios?.extraPods ?? []),
    },
    {
      propName: 'apple.ccacheEnabled',
      propValueGetter: (config) => (config.ios?.ccacheEnabled ?? false).toString(),
    },
    {
      propName: 'apple.privacyManifestAggregationEnabled',
      propValueGetter: (config) =>
        (config.ios?.privacyManifestAggregationEnabled ?? true).toString(),
    },
  ],
  'withIosBuildProperties'
);

export const withIosDeploymentTarget: ConfigPlugin<PluginConfigType> = (config, props) => {
  const deploymentTarget = props.ios?.deploymentTarget;
  if (!deploymentTarget) {
    return config;
  }

  // Updates deployment target in app xcodeproj
  config = withIosDeploymentTargetXcodeProject(config, { deploymentTarget });

  // Updates deployement target in Podfile (Pods project)
  config = withIosDeploymentTargetPodfile(config, props);

  return config;
};

const withIosDeploymentTargetXcodeProject: ConfigPlugin<{ deploymentTarget: string }> = (
  config,
  props
) => {
  return withXcodeProject(config, (config) => {
    config.modResults = updateDeploymentTargetXcodeProject(
      config.modResults,
      props.deploymentTarget
    );
    return config;
  });
};

function updateDeploymentTargetXcodeProject(
  project: XcodeProject,
  deploymentTarget: string
): XcodeProject {
  const { Target } = IOSConfig;
  const targetBuildConfigListIds = Target.getNativeTargets(project)
    .filter(([_, target]) => Target.isTargetOfType(target, Target.TargetType.APPLICATION))
    .map(([_, target]) => target.buildConfigurationList);

  for (const buildConfigListId of targetBuildConfigListIds) {
    for (const [, configurations] of IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
      project,
      buildConfigListId
    )) {
      const { buildSettings } = configurations;
      if (buildSettings?.IPHONEOS_DEPLOYMENT_TARGET) {
        buildSettings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
      }
    }
  }
  return project;
}

const withIosDeploymentTargetPodfile = createBuildPodfilePropsConfigPlugin<PluginConfigType>(
  [
    {
      propName: 'ios.deploymentTarget',
      propValueGetter: (config) => config.ios?.deploymentTarget,
    },
  ],
  'withIosDeploymentTargetPodfile'
);
