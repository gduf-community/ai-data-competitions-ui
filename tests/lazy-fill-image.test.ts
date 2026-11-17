import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  LazyFillImage,
  resolveNearViewportRootMargin,
} from "@/components/shared/lazy-fill-image";

const IMAGE_SRC = "/api/portal/assets?key=award.webp&version=1";

function render(props: Parameters<typeof LazyFillImage>[0]) {
  return renderToStaticMarkup(createElement(LazyFillImage, props));
}

test("默认图片保留 next/image 与原生 lazy", () => {
  const html = render({ src: IMAGE_SRC, alt: "奖状" });
  assert.match(html, /<img /);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /src="\/api\/portal\/assets\?key=award\.webp/);
});

test("nearViewport 在 SSR 阶段只输出占位、不输出 img", () => {
  const html = render({ src: IMAGE_SRC, alt: "奖状", nearViewport: true });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /aria-hidden="true"/);
});

test("priority 图片跳过近视口挂载，仍可被首屏发现", () => {
  const html = render({
    src: IMAGE_SRC,
    alt: "奖状",
    nearViewport: true,
    priority: true,
  });
  assert.match(html, /<img /);
  assert.match(html, /loading="eager"/);
});

test("空地址与失败回退不进入近视口挂载", () => {
  const empty = render({ src: null, alt: "奖状", nearViewport: true });
  assert.match(empty, /暂无图片/);
  assert.doesNotMatch(empty, /<img/);

  const custom = render({
    src: "",
    alt: "奖状",
    nearViewport: true,
    fallbackText: "奖状图片暂不可用",
  });
  assert.match(custom, /奖状图片暂不可用/);
});

test("fetchPriority 作为可选能力透传，默认不设置", () => {
  const withPriority = render({
    src: IMAGE_SRC,
    alt: "奖状",
    fetchPriority: "high",
  });
  assert.match(withPriority, /fetchpriority="high"/i);

  const without = render({ src: IMAGE_SRC, alt: "奖状" });
  assert.doesNotMatch(without, /fetchpriority=/i);
});

test("扩展视口按视口与连接信息取值", () => {
  assert.equal(resolveNearViewportRootMargin({ isMobile: true }), "768px 0px");
  assert.equal(resolveNearViewportRootMargin({ isMobile: false }), "320px 0px");
  assert.equal(
    resolveNearViewportRootMargin({ isMobile: false, effectiveType: "3g" }),
    "320px 0px",
  );
  assert.equal(
    resolveNearViewportRootMargin({ isMobile: true, saveData: true }),
    "0px",
  );
  assert.equal(
    resolveNearViewportRootMargin({ isMobile: false, effectiveType: "2g" }),
    "0px",
  );
  assert.equal(
    resolveNearViewportRootMargin({ isMobile: false, effectiveType: "slow-2g" }),
    "0px",
  );
});
