async page => {
  const baseUrl = "https://thingdock.dev";
  const credentials = {
    username: "admin",
    password: "Admin@2026",
  };

  const results = [];

  const sleep = ms => page.waitForTimeout(ms);

  const waitForHydration = async (extra = 1200) => {
    await page.waitForLoadState("domcontentloaded");
    await sleep(extra);
  };

  const collectConsole = async callback => {
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
      return {
        ok: true,
        value: await callback(),
        messages,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        messages,
      };
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
  };

  const recordStep = async (name, callback) => {
    const captured = await collectConsole(callback);
    results.push({
      step: name,
      ok: captured.ok,
      url: page.url(),
      title: await page.title().catch(() => null),
      consoleMessages: captured.messages,
      ...(captured.ok ? captured.value : { error: captured.error }),
    });
  };

  const ensureLoggedIn = async () => {
    await page.goto(`${baseUrl}/dashboard/command`, { waitUntil: "domcontentloaded" });
    await waitForHydration();

    if (!page.url().includes("/login")) {
      return { loginAttempted: false };
    }

    const textboxes = page.getByRole("textbox");
    await textboxes.nth(0).fill(credentials.username);
    await textboxes.nth(1).fill(credentials.password);
    await page.getByRole("button").filter({ hasText: "Dang nhap" }).first().click().catch(async () => {
      await page.getByRole("button").filter({ hasText: "Đăng nhập" }).first().click();
    });
    await page.waitForURL(/\/dashboard\//, { timeout: 30000 });
    await waitForHydration(1600);
    return { loginAttempted: true };
  };

  const gotoRoute = async path => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    await waitForHydration();
  };

  const tableRows = () => page.locator("tbody tr").filter({ has: page.locator("td") });
  const dialogs = () => page.locator('[role="dialog"], [role="alertdialog"]');
  const topDialog = () => dialogs().last();

  const firstExisting = async locators => {
    for (const locator of locators) {
      if (await locator.count().catch(() => 0)) {
        const candidate = locator.first();
        if (await candidate.isVisible().catch(() => false)) {
          return candidate;
        }
      }
    }
    return null;
  };

  const visibleDialogCount = async () => dialogs().count();

  const waitForDialogGrowth = async previousCount => {
    await page.waitForFunction(
      expectedCount =>
        document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length > expectedCount,
      previousCount,
      { timeout: 15000 },
    );
    await sleep(700);
  };

  const openButton = async text => {
    const button = await firstExisting([
      page.getByRole("button", { name: text }),
      page.getByRole("button").filter({ hasText: text }),
    ]);
    if (!button) {
      throw new Error(`Missing button: ${text}`);
    }
    await button.click();
  };

  const buttonTexts = async scope =>
    scope
      .getByRole("button")
      .evaluateAll(nodes =>
        nodes
          .map(node => (node.textContent || "").trim())
          .filter(Boolean)
          .slice(0, 20),
      )
      .catch(() => []);

  const rowTexts = async limit =>
    tableRows()
      .evaluateAll((nodes, max) =>
        nodes.slice(0, max).map(node => (node.textContent || "").replace(/\s+/g, " ").trim()),
        limit,
      )
      .catch(() => []);

  const summarizeDialog = async () => {
    const dialog = topDialog();
    const heading = await dialog.getByRole("heading").first().textContent().catch(() => null);
    const buttons = await buttonTexts(dialog);
    return {
      heading: heading ? heading.trim() : null,
      buttons,
    };
  };

  const closeTopDialog = async () => {
    const dialog = topDialog();
    const closeButton = await firstExisting([
      dialog.getByRole("button", { name: "Dong" }),
      dialog.getByRole("button", { name: "Đóng" }),
      dialog.getByRole("button", { name: "Huy" }),
      dialog.getByRole("button", { name: "Hủy" }),
      dialog.getByRole("button", { name: "Close" }),
      dialog.getByRole("button").filter({ hasText: /Đóng|Dong|Hủy|Huy|Close/i }),
    ]);

    if (closeButton) {
      await closeButton.click();
    } else {
      await page.keyboard.press("Escape");
    }

    await sleep(500);
  };

  const collectEmptyState = async () => {
    const heading = await firstExisting([
      page.getByRole("heading").filter({ hasText: /Chưa có|Chua co|Không thể tải|Khong the tai/i }),
      page.locator("h3").filter({ hasText: /Chưa có|Chua co|Không thể tải|Khong the tai/i }),
    ]);

    if (!heading) {
      return null;
    }

    const title = ((await heading.textContent().catch(() => "")) || "").trim();
    const card = heading.locator("xpath=ancestor::*[self::div or self::td or self::section][1]");
    const textPreview = ((await card.textContent().catch(() => "")) || "").replace(/\s+/g, " ").trim();

    return {
      title,
      textPreview: textPreview.slice(0, 240),
      actionButtons: await buttonTexts(page),
    };
  };

  const getTableState = async () => {
    const count = await tableRows().count().catch(() => 0);
    const previewRows = await rowTexts(4);
    const emptyState = await collectEmptyState();
    const emptyRowPattern = /Chưa có dữ liệu|Chưa có .*phù hợp|Không có dữ liệu|Khong co du lieu/i;
    const hasDataRows =
      count > 0 &&
      previewRows.some(text => !emptyRowPattern.test(text));

    return {
      rowCount: count,
      previewRows,
      hasDataRows,
      emptyState,
    };
  };

  const clickPreferredRow = async preferredTexts => {
    for (const text of preferredTexts) {
      const row = tableRows().filter({ hasText: text }).first();
      if (await row.isVisible().catch(() => false)) {
        await row.click();
        return text;
      }
    }

    const row = tableRows().first();
    await row.waitFor({ state: "visible", timeout: 20000 });
    await row.click();
    return "first-row";
  };

  const clickActionButton = async texts => {
    for (const text of texts) {
      const button = await firstExisting([
        page.getByRole("button", { name: text }),
        page.getByRole("button").filter({ hasText: text }),
      ]);
      if (button) {
        await button.click();
        return text;
      }
    }
    return null;
  };

  await recordStep("auth", async () => ({
    ...(await ensureLoggedIn()),
    currentUrl: page.url(),
  }));

  await recordStep("devices-create-modal", async () => {
    await gotoRoute("/dashboard/fleet/devices");
    await openButton("Thêm thiết bị");
    await waitForDialogGrowth(0);
    const dialog = topDialog();
    const summary = await summarizeDialog();
    const fieldLabels = await dialog
      .locator("label")
      .evaluateAll(nodes => nodes.map(node => (node.textContent || "").trim()).filter(Boolean));
    await closeTopDialog();
    return {
      dialog: summary,
      fieldLabels,
    };
  });

  await recordStep("devices-workspace-deep", async () => {
    await gotoRoute("/dashboard/fleet/devices");
    const openedRow = await clickPreferredRow(["TRACKER_001", "36E-04721"]);
    await waitForDialogGrowth(0);
    const sectionNames = [
      "Tổng quan",
      "Xe",
      "Cảnh báo",
      "Lỗi",
      "Vận hành",
      "Lộ trình",
      "Lệnh",
      "Dữ liệu thô",
      "Vùng",
      "Cài đặt",
    ];
    const seenSections = [];
    for (const name of sectionNames) {
      const button = topDialog().getByRole("button", { name }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await sleep(700);
        seenSections.push(name);
      }
    }

    let exportSummary = null;
    const exportButton = topDialog().getByRole("button", { name: "Xuất dữ liệu" }).first();
    if (await exportButton.isVisible().catch(() => false)) {
      const beforeNested = await visibleDialogCount();
      await exportButton.click();
      await waitForDialogGrowth(beforeNested);
      exportSummary = await summarizeDialog();
      await closeTopDialog();
    }

    let deleteConfirmSummary = null;
    const deleteButton = topDialog().getByRole("button").filter({ hasText: "Xóa thiết bị" }).first();
    if (await deleteButton.isVisible().catch(() => false)) {
      const beforeNested = await visibleDialogCount();
      await deleteButton.click();
      await waitForDialogGrowth(beforeNested);
      deleteConfirmSummary = await summarizeDialog();
      await closeTopDialog();
    }

    const dialogSummary = await summarizeDialog();
    await closeTopDialog();
    return {
      openedRow,
      dialog: dialogSummary,
      seenSections,
      exportSummary,
      deleteConfirmSummary,
    };
  });

  await recordStep("vehicles-create-and-detail", async () => {
    await gotoRoute("/dashboard/fleet/vehicles");
    await openButton("Thêm phương tiện");
    await waitForDialogGrowth(0);
    const createSummary = await summarizeDialog();
    await closeTopDialog();

    let assignSummary = null;
    const assignButton = await clickActionButton(["Gán thiết bị"]);
    if (assignButton) {
      await waitForDialogGrowth(0);
      assignSummary = await summarizeDialog();
      await closeTopDialog();
    }

    const openedBy = (await clickActionButton(["Chi tiết"])) ?? (await clickPreferredRow(["36E-04721", "TRACKER_001"]));
    await waitForDialogGrowth(0);
    const detailSummary = await summarizeDialog();
    const nestedBefore = await visibleDialogCount();
    const linkedDeviceButton = topDialog().getByRole("button").filter({ hasText: "Mở thiết bị" }).first();
    let nestedDeviceSummary = null;
    if (await linkedDeviceButton.isEnabled().catch(() => false)) {
      await linkedDeviceButton.click();
      await waitForDialogGrowth(nestedBefore);
      nestedDeviceSummary = await summarizeDialog();
      await closeTopDialog();
    }
    await closeTopDialog();

    return {
      createSummary,
      assignSummary,
      openedBy,
      detailSummary,
      nestedDeviceSummary,
    };
  });

  await recordStep("drivers-create-and-detail", async () => {
    await gotoRoute("/dashboard/fleet/drivers");
    await openButton("Thêm tài xế");
    await waitForDialogGrowth(0);
    const createDialog = topDialog();
    const hasLicenseClassCombobox = await createDialog.getByRole("combobox", { name: "Hạng GPLX" }).isVisible().catch(() => false);
    const createSummary = await summarizeDialog();
    await closeTopDialog();

    const tableState = await getTableState();
    if (!tableState.hasDataRows) {
      return {
        hasLicenseClassCombobox,
        createSummary,
        coverage: "empty-state",
        tableState,
      };
    }

    const openedBy = (await clickActionButton(["Chi tiết"])) ?? (await clickPreferredRow(["Lê", "Trọng", "An"]));
    await waitForDialogGrowth(0);
    const detailSummary = await summarizeDialog();

    let linkedVehicleSummary = null;
    let linkedDeviceSummary = null;

    const vehicleButton = topDialog().getByRole("button").filter({ hasText: "Mở phương tiện" }).first();
    if (await vehicleButton.isEnabled().catch(() => false)) {
      const nestedBefore = await visibleDialogCount();
      await vehicleButton.click();
      await waitForDialogGrowth(nestedBefore);
      linkedVehicleSummary = await summarizeDialog();
      await closeTopDialog();
    }

    const deviceButton = topDialog().getByRole("button").filter({ hasText: "Mở thiết bị" }).first();
    if (await deviceButton.isEnabled().catch(() => false)) {
      const nestedBefore = await visibleDialogCount();
      await deviceButton.click();
      await waitForDialogGrowth(nestedBefore);
      linkedDeviceSummary = await summarizeDialog();
      await closeTopDialog();
    }

    await closeTopDialog();

    return {
      hasLicenseClassCombobox,
      createSummary,
      openedBy,
      detailSummary,
      linkedVehicleSummary,
      linkedDeviceSummary,
    };
  });

  await recordStep("trips-create-and-preview", async () => {
    await gotoRoute("/dashboard/trips");
    await openButton("Thêm chuyến đi");
    await waitForDialogGrowth(0);
    const createSummary = await summarizeDialog();
    await closeTopDialog();

    const tableState = await getTableState();
    if (!tableState.hasDataRows) {
      return {
        createSummary,
        coverage: "empty-state",
        tableState,
      };
    }

    const openedBy =
      (await clickActionButton(["Xem nhanh"])) ??
      (await clickPreferredRow(["TRIP", "TRACKER_001", "36E-04721"]));
    await waitForDialogGrowth(0);

    const previewDialog = topDialog();
    const openDetailLinkVisible = await previewDialog.getByRole("link", { name: "Mở trang chi tiết" }).isVisible().catch(() => false);
    const playButton = await firstExisting([
      previewDialog.getByRole("button", { name: "Phát" }),
      previewDialog.getByRole("button").filter({ hasText: "Phát" }),
    ]);
    if (playButton) {
      await playButton.click();
      await sleep(600);
    }

    const previewSummary = await summarizeDialog();
    await closeTopDialog();

    return {
      createSummary,
      openedBy,
      previewSummary,
      openDetailLinkVisible,
    };
  });

  await recordStep("zones-sheet-branches", async () => {
    await gotoRoute("/dashboard/zones");
    const quickButton = await firstExisting([
      page.getByRole("button", { name: "Thiết lập nhanh" }),
      page.getByRole("button").filter({ hasText: "Thiết lập nhanh" }),
    ]);
    if (quickButton) {
      await quickButton.click();
    } else {
      await clickPreferredRow(["36E-04721", "TRACKER_001"]);
    }

    await waitForDialogGrowth(0);
    const sheet = topDialog();
    const circleRadio = await firstExisting([
      sheet.getByLabel("Bán kính"),
      sheet.getByText("Bán kính"),
    ]);
    const boundaryRadio = await firstExisting([
      sheet.getByLabel("Ranh giới hành chính"),
      sheet.getByText("Ranh giới hành chính"),
    ]);

    if (boundaryRadio) {
      await boundaryRadio.click();
      await sleep(700);
    }
    if (circleRadio) {
      await circleRadio.click();
      await sleep(700);
    }

    const summary = await summarizeDialog();
    const labels = await sheet
      .locator("label")
      .evaluateAll(nodes => nodes.map(node => (node.textContent || "").trim()).filter(Boolean).slice(0, 16));
    await closeTopDialog();

    return {
      summary,
      labels,
    };
  });

  await recordStep("exports-create-dialog", async () => {
    await gotoRoute("/dashboard/platform/exports");
    await openButton("Tạo yêu cầu");
    await waitForDialogGrowth(0);
    const dialog = topDialog();
    const selectCount = await dialog.locator('[role="combobox"]').count().catch(() => 0);
    const summary = await summarizeDialog();
    await closeTopDialog();
    return { summary, selectCount };
  });

  await recordStep("customers-modal-detail-and-confirm", async () => {
    await gotoRoute("/dashboard/fleet/customers");
    await openButton("Thêm khách hàng");
    await waitForDialogGrowth(0);
    const createSummary = await summarizeDialog();
    await closeTopDialog();

    const tableState = await getTableState();
    if (!tableState.hasDataRows) {
      return {
        createSummary,
        coverage: "empty-state",
        tableState,
      };
    }

    let editSummary = null;
    const editButton = await clickActionButton(["Sửa"]);
    if (editButton) {
      await waitForDialogGrowth(0);
      editSummary = await summarizeDialog();
      await closeTopDialog();
    }

    let deleteSummary = null;
    const deleteButton = await clickActionButton(["Xóa"]);
    if (deleteButton) {
      await waitForDialogGrowth(0);
      deleteSummary = await summarizeDialog();
      await closeTopDialog();
    }

    let detailNavigation = null;
    const detailButton = await firstExisting([
      page.getByRole("button", { name: "Chi tiết" }),
      page.getByRole("button").filter({ hasText: "Chi tiết" }),
    ]);
    if (detailButton) {
      await detailButton.click();
      await page.waitForURL(/\/dashboard\/fleet\/customers\/\d+/, { timeout: 15000 });
      detailNavigation = {
        url: page.url(),
        pageTitle: await page.title().catch(() => null),
      };
      await page.goBack({ waitUntil: "domcontentloaded" });
      await waitForHydration();
    }

    return {
      createSummary,
      editSummary,
      deleteSummary,
      detailNavigation,
    };
  });

  await recordStep("users-create-and-edit", async () => {
    await gotoRoute("/dashboard/platform/users");
    await openButton("Thêm người dùng");
    await waitForDialogGrowth(0);
    const createSummary = await summarizeDialog();
    await closeTopDialog();

    const editButton = await firstExisting([
      page.getByRole("button", { name: "Sửa" }),
      page.getByRole("button").filter({ hasText: "Sửa" }),
    ]);
    if (!editButton) {
      throw new Error("Missing edit button on users page");
    }
    await editButton.click();
    await waitForDialogGrowth(0);
    const editSummary = await summarizeDialog();
    await closeTopDialog();

    return {
      createSummary,
      editSummary,
    };
  });

  await recordStep("firmware-upload-and-deploy", async () => {
    await gotoRoute("/dashboard/platform/firmware");

    const uploadButton = await firstExisting([
      page.getByRole("button", { name: "Tải lên firmware" }),
      page.getByRole("button").filter({ hasText: "Tải lên" }),
    ]);
    if (!uploadButton) {
      throw new Error("Missing firmware upload button");
    }
    await uploadButton.click();
    await waitForDialogGrowth(0);
    const uploadSummary = await summarizeDialog();
    await closeTopDialog();

    const deployButton = await firstExisting([
      page.getByRole("button", { name: "Triển khai" }),
      page.getByRole("button").filter({ hasText: "Triển khai" }),
    ]);
    if (!deployButton) {
      throw new Error("Missing firmware deploy button");
    }
    await deployButton.click();
    await waitForDialogGrowth(0);
    const deployDialog = topDialog();
    const deviceItems = await deployDialog.locator('label').count().catch(() => 0);
    const deploySummary = await summarizeDialog();
    await closeTopDialog();

    return {
      uploadSummary,
      deploySummary,
      deviceItems,
    };
  });

  await recordStep("violations-detail-modal", async () => {
    await gotoRoute("/dashboard/attention/violations");
    const tableState = await getTableState();
    if (!tableState.hasDataRows) {
      return {
        coverage: "empty-state",
        tableState,
      };
    }

    const openedBy =
      (await clickActionButton(["Chi tiết"])) ??
      (await clickPreferredRow(["TRACKER_001", "36E-04721"]));
    await waitForDialogGrowth(0);
    const summary = await summarizeDialog();
    const hasMapButton = await topDialog().getByRole("link", { name: "Mở vị trí trên bản đồ" }).isVisible().catch(() => false);
    await closeTopDialog();
    return { openedBy, summary, hasMapButton };
  });

  await recordStep("alerts-queue-detail-modal", async () => {
    await gotoRoute("/dashboard/attention/queue");
    const openedRow = await clickPreferredRow(["P0420", "TRACKER_001", "36E-04721"]);
    await waitForDialogGrowth(0);
    const summary = await summarizeDialog();
    const hasOpenQueueLink = await topDialog().getByRole("link").filter({ hasText: "Mở queue đầy đủ" }).isVisible().catch(() => false);
    await closeTopDialog();
    return {
      openedRow,
      summary,
      hasOpenQueueLink,
    };
  });

  await recordStep("maintenance-branches", async () => {
    await gotoRoute("/dashboard/attention/maintenance");
    await openButton("Tạo lịch bảo trì");
    await waitForDialogGrowth(0);
    const createSummary = await summarizeDialog();
    await closeTopDialog();

    const obdCreateButton = await firstExisting([
      page.getByRole("button", { name: "Tạo phiếu" }),
      page.getByRole("button").filter({ hasText: "Tạo phiếu" }),
    ]);
    let obdSummary = null;
    if (obdCreateButton) {
      await obdCreateButton.click();
      await waitForDialogGrowth(0);
      obdSummary = await summarizeDialog();
      await closeTopDialog();
    }

    const tabs = ["Lịch", "Dự báo km"];
    const visitedTabs = [];
    for (const tab of tabs) {
      const tabButton = page.getByRole("tab", { name: tab }).first();
      if (await tabButton.isVisible().catch(() => false)) {
        await tabButton.click();
        await sleep(700);
        visitedTabs.push(tab);
      }
    }

    return {
      createSummary,
      obdSummary,
      visitedTabs,
    };
  });

  await recordStep("notifications-list-branch", async () => {
    await gotoRoute("/dashboard/attention/notifications");
    const filterComboboxes = await page.locator('[role="combobox"]').count().catch(() => 0);
    const loadMoreButton = await firstExisting([
      page.getByRole("button", { name: "Tải thêm" }),
      page.getByRole("button").filter({ hasText: "Tải thêm" }),
    ]);
    const hadLoadMore = Boolean(loadMoreButton);
    if (loadMoreButton) {
      await loadMoreButton.click();
      await sleep(900);
    }
    return {
      filterComboboxes,
      hadLoadMore,
    };
  });

  await recordStep("settings-tabs-branch", async () => {
    await gotoRoute("/dashboard/settings");
    const tabs = ["Hồ sơ", "Mật khẩu", "Thông báo", "Giao diện"];
    const visitedTabs = [];
    for (const tab of tabs) {
      const tabButton = page.getByRole("tab", { name: tab }).first();
      if (await tabButton.isVisible().catch(() => false)) {
        await tabButton.click();
        await sleep(600);
        visitedTabs.push(tab);
      }
    }

    const saveButtons = await page
      .getByRole("button")
      .evaluateAll(nodes =>
        nodes
          .map(node => (node.textContent || "").trim())
          .filter(Boolean)
          .filter(text => /Lưu|Cập nhật|Đổi mật khẩu/i.test(text))
          .slice(0, 12),
      )
      .catch(() => []);

    return {
      visitedTabs,
      saveButtons,
    };
  });

  await recordStep("simulator-branch", async () => {
    await gotoRoute("/dashboard/simulator");
    const restrictionText = await page.getByText("Bạn không có quyền chạy mô phỏng thiết bị.").isVisible().catch(() => false);
    const headingVisible = await page.getByText("Hướng dẫn nhanh").isVisible().catch(() => false);
    const actionButtons = await page
      .getByRole("button")
      .evaluateAll(nodes =>
        nodes
          .map(node => (node.textContent || "").trim())
          .filter(Boolean)
          .slice(0, 16),
      )
      .catch(() => []);

    return {
      restrictionText,
      headingVisible,
      actionButtons,
    };
  });

  const failed = results.filter(item => !item.ok);
  return {
    ok: failed.length === 0,
    failedSteps: failed.map(item => item.step),
    results,
  };
}
