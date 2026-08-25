import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "爱的五种语言｜双向关系自测",
  description: "30 道题，看见你喜欢如何被爱，也看见你习惯如何去爱。",
  metadataBase: new URL("https://zhouying.cn/5lovelanguages"),
  openGraph: { title: "爱的五种语言｜双向关系自测", description: "爱有两种方向：我如何接收，也如何给予。", type: "website" },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
