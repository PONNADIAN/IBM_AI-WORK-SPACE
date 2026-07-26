# Testing and Validation Workflow

Whenever making any code change, follow these steps strictly:

1. Save the file.
2. Start the dev server if needed.
3. Open the website in Playwright.
4. Detect all interactive elements.
5. Click every button.
6. Fill every form.
7. Verify API responses.
8. Check browser console.
9. Check network requests.
10. Take screenshots.
11. Compare with previous screenshots for visual regressions.
12. Fix any detected errors automatically.
13. Re-run the tests until all pass.
14. Generate a final test report.
15. Commit the changes only when all tests pass.
