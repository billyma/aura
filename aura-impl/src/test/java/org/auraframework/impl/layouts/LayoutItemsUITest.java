/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.auraframework.impl.layouts;

import org.auraframework.test.WebDriverTestCase;
import org.auraframework.test.WebDriverUtil.BrowserType;
import org.openqa.selenium.By;

/**
 * Automation for verifying Layouts.
 */
public class LayoutItemsUITest extends WebDriverTestCase {
    private final By resultBtn1 = By.cssSelector(".Button1");
    private final By resultBtn2 = By.cssSelector(".Button2");

    public LayoutItemsUITest(String name) {
        super(name);
    }

    /**
     * Verify that navigating forward and backward works when underlying LayoutsDef has multiple layoutitems per layout.
     * Automation for W-954182
     */
    // TODO(W-2375142): Default layouts not properly loaded when navigating for page to first time in IE10 and 11.
    @ExcludeBrowsers({ BrowserType.IE10, BrowserType.IE11 })
    public void testNavigationWhenLayoutHasMultipleLayoutItems() throws Exception {
        By forwardButton = By.cssSelector(".Forward_Button");
        By backButton = By.cssSelector(".Back_Button");
        By layoutDone = By.cssSelector(".layoutDone");
        By removeLayoutDone = By.cssSelector(".Remove_Layout_Done");

        open("/layoutServiceTest/multipleLayoutItems.app");

        // might take a while for initial layout to load
        auraUITestingUtil.waitForElement(layoutDone);
        findDomElement(layoutDone);
        verifyExpectedResultsForInitialLayout();

        // subsequent layouts should NOT take that long to load
        auraUITestingUtil.waitForElement(layoutDone);
        findDomElement(forwardButton).click();
        findDomElement(layoutDone);
        verifyExpectedResultsForLayout1();

        findDomElement(forwardButton).click();
        findDomElement(layoutDone);
        verifyExpectedResultForLayout2();

        findDomElement(backButton).click();
        findDomElement(layoutDone);
        verifyExpectedResultsForLayout1();

        findDomElement(backButton).click();
        findDomElement(layoutDone);
        verifyExpectedResultsForInitialLayout();

        findDomElement(forwardButton).click();
        findDomElement(layoutDone);
        verifyExpectedResultsForLayout1();

        findDomElement(removeLayoutDone).click();
        waitForElementDisappear("'layoutDone' class never removed from div", layoutDone);
        auraUITestingUtil.getEval("window.history.back()");
        findDomElement(layoutDone);
        verifyExpectedResultsForInitialLayout();

        findDomElement(removeLayoutDone).click();
        waitForElementDisappear("'layoutDone' class never removed from div", layoutDone);
        auraUITestingUtil.getEval("window.history.forward()");
        findDomElement(layoutDone);
        verifyExpectedResultsForLayout1();
    }

    private void verifyExpectedResultsForInitialLayout() throws Exception {
        waitForElementTextPresent(findDomElement(resultBtn1), "Ready to party?");
        assertEquals("", findDomElement(resultBtn2).getText());
    }

    private void verifyExpectedResultsForLayout1() throws Exception {
        assertEquals("Step1", getHashToken());
        waitForElementTextPresent(findDomElement(resultBtn1), "Step 1a. Wear a Suit");
        assertEquals("Step 1b. Wear a Jacket", findDomElement(resultBtn2).getText());

    }

    private void verifyExpectedResultForLayout2() throws Exception {
        assertEquals("Step2", getHashToken());
        waitForElementTextPresent(findDomElement(resultBtn1), "Step 2a. Start your car");
        assertEquals("Step 2b. Go party", findDomElement(resultBtn2).getText());
    }

    private String getHashToken() {
        String URL = getDriver().getCurrentUrl();
        assertTrue("URL does not contain a # token", URL.indexOf("#") > -1);
        String[] tokens = URL.split("#");
        assertEquals("URL has multiple # tokens", 2, tokens.length);
        return tokens[1];
    }
}
