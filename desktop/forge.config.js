module.exports = {
  packagerConfig: {
    name: "CholoShikhi",
    executableName: "CholoShikhi",
    icon: "./assets/icon.ico",
    asar: true,
    ignore: [
      /^\/src\/$/,
      /^\/assets\/$/,
      /^\/forge\.config\.js$/,
      /^\/package-lock\.json$/,
      /^\/\.gitignore$/,
    ],
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "CholoShikhi",
        authors: "Siblings Team",
        description: "CholoShikhi AI — Bengali AI Learning Assistant",
        setupIcon: "./assets/icon.ico",
        noMsi: true,
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
  ],
};
