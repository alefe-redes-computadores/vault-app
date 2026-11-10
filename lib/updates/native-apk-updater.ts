"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { VaultApprovedRelease } from "./release-registry";

export type VaultNativeDownloadProgress = {
  build: number;
  received: number;
  total: number;
  percent: number;
};
export type VaultNativeInstallResult = { opened?: boolean; permissionRequired?: boolean };
export type VaultNativeApkMetadata = {
  build: number;
  sha256: string;
  bytes: number;
  version: string;
  appId: string;
  certificateSha256: string;
};
type VaultNativePlugin = {
  downloadVerified(options: VaultNativeApkMetadata): Promise<{ verified: boolean; build: number }>;
  cancelDownload(): Promise<{ requested: boolean }>;
  installVerified(options: VaultNativeApkMetadata): Promise<VaultNativeInstallResult>;
  openInstallSettings(): Promise<void>;
  addListener(event: "downloadProgress", callback: (event: VaultNativeDownloadProgress) => void): Promise<PluginListenerHandle>;
};
const plugin = registerPlugin<VaultNativePlugin>("VaultApkUpdater");

export function getVaultNativeUpdater(): VaultNativePlugin | null {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("VaultApkUpdater")
    ? plugin : null;
}
export function nativeMetadataForRelease(release: VaultApprovedRelease, installedBuild: number | null): VaultNativeApkMetadata | null {
  if (installedBuild === null || release.build <= installedBuild ||
      release.appId !== "com.alefejohsefe.vault" ||
      !release.signerSha256 || !/^[0-9a-f]{64}$/.test(release.signerSha256) ||
      !/^[0-9a-f]{64}$/.test(release.checksum) ||
      release.bytes < 100000 || release.bytes > 160 * 1048576) return null;
  return {
    build: release.build,
    sha256: release.checksum,
    bytes: release.bytes,
    version: release.version,
    appId: release.appId,
    certificateSha256: release.signerSha256,
  };
}
