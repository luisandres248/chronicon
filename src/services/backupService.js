import { Capacitor, registerPlugin } from "@capacitor/core";

const BackupFile = registerPlugin("BackupFile", {
  web: async () => ({
    async pickBackupFile() {
      throw new Error("Automatic backups are only available in the native Android app.");
    },
    async writeBackup() {
      throw new Error("Automatic backups are only available in the native Android app.");
    },
  }),
});

export function isAutoBackupSupported() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function pickBackupDestination(suggestedName = "chronicon-autobackup.json") {
  return BackupFile.pickBackupFile({ suggestedName });
}

export async function writeBackupToDestination(uri, content) {
  return BackupFile.writeBackup({ uri, content });
}
