import type { FC, ReactNode } from "react";

export const metadata = {
  title: "FactFeed API",
};

type Props = {
  children: ReactNode;
};

const RootLayout: FC<Props> = ({ children }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
