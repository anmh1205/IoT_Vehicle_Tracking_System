async page => {
  const baseUrl = "https://thingdock.dev";
  const credentials = {
    username: "admin",
    password: "Admin@2026",
  };

  const waitForHydration = async () => {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1200);
  };

  const withConsoleCapture = async callback => {
    const messages = [];
    const onConsole = msg => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        messages.push({ type, text: msg.text() });
      }
    };
    const onPageError = error => {
      messages.push({ type: "pageerror", text: error.message });
    };

    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    try {
      const value = await callback();
      return {
        value,
        messages,
      };
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
  };

  const ensureLoggedIn = async () => {
    await page.goto(`${baseUrl}/dashboard/command`, { waitUntil: "domcontentloaded" });
    await waitForHydration();

    if (!page.url().includes("/login")) {
      return { loggedIn: true, loginAttempted: false };
    }

    await page.getByRole("textbox", { name: "Tên đăng nhập" }).fill(credentials.username);
    await page.getByRole("textbox", { name: "Mật khẩu" }).fill(credentials.password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 20000 });
    await waitForHydration();

    return { loggedIn: true, loginAttempted: true };
  };

  const getLoadStatus = async pattern => {
    const text = await page.locator(`text=${pattern}`).first().textContent().catch(() => null);
    return text ? text.trim() : null;
  };

  const results = [];

  results.push({
    step: "auth",
    ...(await ensureLoggedIn()),
    url: page.url(),
    title: await page.title(),
  });

  const routeChecks = [
    {
      name: "dashboard-command",
      path: "/dashboard/command",
      check: async () => ({
        hasOverviewHeading: await page.getByRole("heading", { name: "Tổng quan" }).isVisible(),
      }),
    },
    {
      name: "fleet-devices",
      path: "/dashboard/fleet/devices",
      check: async () => ({
        hasDevicesLabel: await page.locator("text=Thiết bị").first().isVisible(),
        hasTracker: await page.locator("text=TRACKER_001").first().isVisible().catch(() => false),
      }),
    },
    {
      name: "fleet-vehicles",
      path: "/dashboard/fleet/vehicles",
      check: async () => ({
        hasVehiclesHeading: await page.getByRole("heading", { name: "Phương tiện" }).isVisible(),
      }),
    },
    {
      name: "fleet-customers",
      path: "/dashboard/fleet/customers",
      check: async () => ({
        hasCustomersHeading: await page.getByRole("heading", { name: "Khách hàng" }).isVisible(),
      }),
    },
    {
      name: "attention-maintenance",
      path: "/dashboard/attention/maintenance",
      check: async () => ({
        hasMaintenanceHeading: await page.getByRole("heading", { name: "Bảo trì" }).isVisible(),
      }),
    },
    {
      name: "attention-violations",
      path: "/dashboard/attention/violations",
      check: async () => ({
        hasViolationsHeading: await page.getByRole("heading", { name: "Vi phạm" }).isVisible(),
      }),
    },
    {
      name: "attention-notifications",
      path: "/dashboard/attention/notifications",
      check: async () => ({
        hasNotificationsHeading: await page.getByRole("heading", { name: "Thông báo" }).isVisible(),
      }),
    },
    {
      name: "platform-exports",
      path: "/dashboard/platform/exports",
      check: async () => ({
        hasExportsHeading: await page.getByRole("heading", { name: "Xuất dữ liệu" }).isVisible(),
      }),
    },
    {
      name: "zones",
      path: "/dashboard/zones",
      check: async () => ({
        hasZonesHeading: await page.getByRole("heading", { name: "Vùng" }).isVisible(),
      }),
    },
  ];

  for (const routeCheck of routeChecks) {
    const captured = await withConsoleCapture(async () => {
      await page.goto(`${baseUrl}${routeCheck.path}`, { waitUntil: "domcontentloaded" });
      await waitForHydration();
      return routeCheck.check();
    });

    results.push({
      step: routeCheck.name,
      url: page.url(),
      title: await page.title(),
      consoleMessages: captured.messages,
      ...captured.value,
    });
  }

  const driversCheck = await withConsoleCapture(async () => {
    await page.goto(`${baseUrl}/dashboard/fleet/drivers`, { waitUntil: "domcontentloaded" });
    await waitForHydration();
    await page.getByRole("button", { name: "Thêm tài xế" }).first().click();
    await page.waitForTimeout(500);

    return {
      modalVisible: await page.getByRole("dialog", { name: "Thêm tài xế" }).isVisible(),
      hasLicenseClassCombobox: await page.getByRole("combobox", { name: "Hạng GPLX" }).isVisible(),
      hasLicenseClassValue: await page.locator("text=Chưa xác định").first().isVisible(),
    };
  });

  results.push({
    step: "drivers-create-modal",
    url: page.url(),
    title: await page.title(),
    consoleMessages: driversCheck.messages,
    ...driversCheck.value,
  });

  const queueCheck = await withConsoleCapture(async () => {
    await page.goto(`${baseUrl}/dashboard/attention/queue`, { waitUntil: "domcontentloaded" });
    await waitForHydration();

    const before = await getLoadStatus("Đã tải");
    const dtcVisible = await page.locator("text=/OBD: Mã lỗi|DTC/").first().isVisible().catch(() => false);
    const loadMore = page.getByRole("button", { name: "Tải thêm" });
    const hasLoadMore = await loadMore.isVisible().catch(() => false);

    if (hasLoadMore) {
      await loadMore.click();
      await page.waitForTimeout(1000);
    }

    const after = await getLoadStatus("Đã tải");

    return {
      before,
      after,
      dtcVisible,
      hasLoadMore,
    };
  });

  results.push({
    step: "attention-queue",
    url: page.url(),
    title: await page.title(),
    consoleMessages: queueCheck.messages,
    ...queueCheck.value,
  });

  const firmwareCheck = await withConsoleCapture(async () => {
    await page.goto(`${baseUrl}/dashboard/platform/firmware`, { waitUntil: "domcontentloaded" });
    await waitForHydration();

    const libraryBefore = await getLoadStatus("Đã tải");
    const libraryLoadMore = page.getByRole("button", { name: "Tải thêm" });
    const canLoadMore = await libraryLoadMore.isVisible().catch(() => false);

    if (canLoadMore) {
      await libraryLoadMore.click();
      await page.waitForTimeout(1000);
    }

    const libraryAfter = await getLoadStatus("Đã tải");

    await page.getByRole("tab", { name: "Gán theo thiết bị" }).click();
    await page.waitForTimeout(1000);

    return {
      libraryBefore,
      libraryAfter,
      canLoadMore,
      assignmentTabVisible: await page.getByRole("tab", { name: "Gán theo thiết bị" }).isVisible(),
      assignmentHasDeviceText: await page.locator("text=/TRACKER_001|36E-04721|Thiết bị/").first().isVisible().catch(() => false),
    };
  });

  results.push({
    step: "platform-firmware",
    url: page.url(),
    title: await page.title(),
    consoleMessages: firmwareCheck.messages,
    ...firmwareCheck.value,
  });

  const mapCheck = await withConsoleCapture(async () => {
    await page.goto(`${baseUrl}/dashboard/operations/map`, { waitUntil: "domcontentloaded" });
    await waitForHydration();

    const deviceButton = page.getByRole("button", { name: "Chọn 36E-04721" });
    await deviceButton.click();
    await page.waitForTimeout(1200);

    return {
      selectedUrl: page.url(),
      trackerLabelVisible: await page.locator("text=TRACKER_001").first().isVisible(),
      inspectRailVisible: await page.locator("text=Thông số nhanh").isVisible(),
      mapActionVisible: await page.getByRole("button", { name: "Hiện vùng", exact: true }).isVisible(),
    };
  });

  results.push({
    step: "operations-map",
    url: page.url(),
    title: await page.title(),
    consoleMessages: mapCheck.messages,
    ...mapCheck.value,
  });

  return results;
}
