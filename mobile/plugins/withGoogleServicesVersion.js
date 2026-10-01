const { withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withGoogleServicesVersion(config) {
  config = withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const dependency = "classpath 'com.google.gms:google-services:4.5.0'";
    const dependencyPattern = /classpath\s+(['"])com\.google\.gms:google-services:[^'"]+\1/;

    if (dependencyPattern.test(contents)) {
      config.modResults.contents = contents.replace(dependencyPattern, dependency);
    } else {
      const dependenciesPattern = /(dependencies\s*\{)/;
      if (!dependenciesPattern.test(contents)) {
        throw new Error('Could not find the project-level Gradle dependencies block.');
      }
      config.modResults.contents = contents.replace(dependenciesPattern, `$1\n        ${dependency}`);
    }

    return config;
  });

  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('com.google.gms.google-services')) {
      const reactPluginPattern = /apply plugin:\s*['"]com\.facebook\.react['"]/;
      if (!reactPluginPattern.test(contents)) {
        throw new Error('Could not find the React Native plugin in the app Gradle file.');
      }
      contents = contents.replace(
        reactPluginPattern,
        "$&\napply plugin: 'com.google.gms.google-services'"
      );
    }

    const firebaseDependencies = [
      'implementation platform("com.google.firebase:firebase-bom:34.19.0")',
      'implementation "com.google.firebase:firebase-analytics"',
    ];
    const missingDependencies = firebaseDependencies.filter((dependency) => {
      const artifact = dependency.match(/com\.google\.firebase:[^"']+/)?.[0];
      return artifact && !contents.includes(artifact);
    });

    if (missingDependencies.length > 0) {
      const dependenciesPattern = /(dependencies\s*\{)/;
      if (!dependenciesPattern.test(contents)) {
        throw new Error('Could not find the app-level Gradle dependencies block.');
      }
      contents = contents.replace(
        dependenciesPattern,
        `$1\n    ${missingDependencies.join('\n    ')}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};