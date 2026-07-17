async page => {
  const baseUrl = "https://thingdock.dev";
  const credentials = {
    username: "admin",
    password: "Admin@2026",
  };

  const sleep = ms => page.waitForTimeout(ms);

  const waitForHydration = async (extra = 1200) => {
    await page.waitForLoadState("domcontentloaded");
    await sleep(extra);
  };

  const ensureLoggedIn = async () => {
    await page.goto(`${baseUrl}/dashboard/command`, { waitUntil: "domcontentloaded" });
    await waitForHydration();

    if (!page.url().includes("/login")) {
      return;
    }

    const textboxes = page.getByRole("textbox");
    await textboxes.nth(0).fill(credentials.username);
    await textboxes.nth(1).fill(credentials.password);
    await page.getByRole("button").filter({ hasText: "Dang nhap" }).first().click().catch(async () => {
      await page.getByRole("button").filter({ hasText: "Đăng nhập" }).first().click();
    });
    await page.waitForURL(/\/dashboard\//, { timeout: 30000 });
    await waitForHydration(1600);
  };

  const gotoRoute = async path => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    await waitForHydration();
  };

  const tableRows = () => page.locator("tbody tr").filter({ has: page.locator("td") });
  const dialogs = () => page.locator('[role="dialog"]');
  const topDialog = () => dialogs().last();

  const waitForDialogGrowth = async previousCount => {
    await page.waitForFunction(
      expectedCount => document.querySelectorAll('[role="dialog"]').length > expectedCount,
      previousCount,
      { timeout: 15000 },
    );
    await sleep(800);
  };

  const visibleDialogCount = async () => dialogs().count();

  const summarizeDialog = async () => {
    const dialog = topDialog();
    const heading = await dialog.getByRole("heading").first().textContent().catch(() => null);
    const text = await dialog.locator("text=*").first().textContent().catch(() => null);
    const buttons = await dialog
      .getByRole("button")
      .evaluateAll(nodes =>
        nodes
          .map(node => (node.textContent || "").trim())
          .filter(Boolean)
          .slice(0, 12),
      )
      .catch(() => []);
    return {
      heading: heading ? heading.trim() : null,
      textPreview: text ? text.trim().slice(0, 200) : null,
      buttons,
    };
  };

  const closeTopDialog = async () => {
    const dialog = topDialog();
    const closeButton = await dialog
      .getByRole("button")
      .filter({ hasText: /Đóng|Dong|Hủy|Huy|Close/i })
      .first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await sleep(500);
  };

  const buttonTexts = async scope =>
    scope
      .getByRole("button")
      .evaluateAll(nodes =>
        nodes
          .map(node => (node.textContent || "").trim())
          .filter(Boolean)
          .slice(0, 24),
      )
      .catch(() => []);

  const rowTexts = async count =>
    tableRows()
      .evaluateAll((nodes, limit) =>
        nodes.slice(0, limit).map(node => (node.textContent || "").replace(/\s+/g, " ").trim()),
        count,
      )
      .catch(() => []);

  const inspectAction = async ({ route, label, buttonText, preferredTexts = [] }) => {
    await gotoRoute(route);
    const rows = tableRows();
    const rowCount = await rows.count().catch(() => 0);
    const firstRows = await rowTexts(4);
    const before = await visibleDialogCount();

    const rowButton = page.getByRole("button", { name: buttonText }).first();
    const rowButtonVisible = await rowButton.isVisible().catch(() => false);

    let rowClickWorked = false;
    let rowClickSummary = null;
    let buttonClickWorked = false;
    let buttonClickSummary = null;
    let matchedRowText = null;

    if (rowCount > 0) {
      for (const text of preferredTexts) {
        const row = rows.filter({ hasText: text }).first();
        if (await row.isVisible().catch(() => false)) {
          matchedRowText = text;
          await row.click();
          break;
        }
      }

      if (!matchedRowText) {
        await rows.first().click();
      }

      try {
        await waitForDialogGrowth(before);
        rowClickWorked = true;
        rowClickSummary = await summarizeDialog();
        await closeTopDialog();
      } catch (error) {
        rowClickSummary = {
          error: error instanceof Error ? error.message : String(error),
          pageButtons: await buttonTexts(page),
        };
      }
    }

    if (rowButtonVisible) {
      const dialogCountBeforeButton = await visibleDialogCount();
      await rowButton.click();
      try {
        await waitForDialogGrowth(dialogCountBeforeButton);
        buttonClickWorked = true;
        buttonClickSummary = await summarizeDialog();
        await closeTopDialog();
      } catch (error) {
        buttonClickSummary = {
          error: error instanceof Error ? error.message : String(error),
          pageButtons: await buttonTexts(page),
        };
      }
    }

    return {
      label,
      route,
      rowCount,
      firstRows,
      rowButtonVisible,
      matchedRowText,
      rowClickWorked,
      rowClickSummary,
      buttonClickWorked,
      buttonClickSummary,
      pageButtons: await buttonTexts(page),
    };
  };

  await ensureLoggedIn();

  const results = [];
  results.push(
    await inspectAction({
      route: "/dashboard/fleet/drivers",
      label: "drivers",
      buttonText: "Chi tiết",
      preferredTexts: ["Lê", "Trọng", "An"],
    }),
  );
  results.push(
    await inspectAction({
      route: "/dashboard/trips",
      label: "trips",
      buttonText: "Xem nhanh",
      preferredTexts: ["TRIP", "TRACKER_001", "36E-04721"],
    }),
  );
  results.push(
    await inspectAction({
      route: "/dashboard/attention/violations",
      label: "violations",
      buttonText: "Chi tiết",
      preferredTexts: ["TRACKER_001", "36E-04721"],
    }),
  );

  return { ok: true, results };
}
