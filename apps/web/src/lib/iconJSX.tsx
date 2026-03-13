import { ComponentProps } from 'react';
import * as SolarIcons from "@solar-icons/react";

type IconProps = Record<string, any>;

// Create wrapper components for consistent styling
const UsersGroupIcon = (props: IconProps) => (
  <SolarIcons.UsersGroupTwoRounded {...props} weight="Bold" />
);

const BoldChatIcon = (props: IconProps) => (
  <SolarIcons.ChatRound {...props} weight="Bold" />
);

const BoldGamesIcon = (props: IconProps) => (
  <SolarIcons.Gamepad {...props} weight="Bold" />
);

const BoldHeadphonesIcon = (props: IconProps) => (
  <SolarIcons.HeadphonesRoundSound {...props} weight="Bold" />
);

const BoldHistoryIcon = (props: IconProps) => (
  <SolarIcons.History2 {...props} weight="Bold" />
);

const BoldRoundTransferDiagonal = (props: IconProps) => (
  <SolarIcons.RoundTransferDiagonal {...props} weight="Bold" />
);

const BoldUser = (props: IconProps) => (
  <SolarIcons.User {...props} weight="Bold" />
);

const BoldSettingsMinimalistic = (props: IconProps) => (
  <SolarIcons.SettingsMinimalistic {...props} weight="Bold" />
);

const BoldLogout = (props: IconProps) => (
  <SolarIcons.Logout2 {...props} weight="Bold" />
);

const BoldHome = (props: IconProps) => (
  <SolarIcons.Home {...props} weight="Bold" />
);

const BoldSettings = (props: IconProps) => (
  <SolarIcons.Settings {...props} weight="Bold" />
);

const BoldWallet2 = (props: IconProps) => (
  <SolarIcons.Wallet2 {...props} weight="Bold" />
);

const BoldChatLine = (props: IconProps) => (
  <SolarIcons.ChatLine {...props} weight="Bold" />
);

const BoldBell = (props: IconProps) => (
  <SolarIcons.Bell {...props} weight="Bold" />
);

const BoldCheckCircle = (props: IconProps) => (
  <SolarIcons.CheckCircle {...props} weight="Bold" />
);

export {
  UsersGroupIcon,
  BoldChatIcon,
  BoldGamesIcon,
  BoldHeadphonesIcon,
  BoldHistoryIcon,
  BoldRoundTransferDiagonal,
  BoldUser,
  BoldSettingsMinimalistic,
  BoldLogout,
  BoldWallet2,
  BoldChatLine,
  BoldBell,
  BoldCheckCircle,
  BoldHome,
  BoldSettings,
};
