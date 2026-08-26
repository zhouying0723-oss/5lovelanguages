import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "爱的五种语言｜双向关系自测",
  description: "20 道核心题，根据你的答案自适应排序，看见你如何接收与表达爱。",
  metadataBase: new URL("https://zhouying.cn/5lovelanguages"),
  openGraph: { title: "爱的五种语言｜双向关系自测", description: "爱有两种方向：我如何接收，也如何给予。", type: "website" },
  icons: { icon: "/5lovelanguages/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
