import { Document, Packer, Paragraph } from 'docx'
import * as fs from 'fs'
import html2md from 'html-to-md'
import puppeteer, { Page } from 'puppeteer'

async function sleep(durationMs: number): Promise<void> {
  let remainingTime = durationMs

  while (remainingTime > 0) {
    console.log(`Time remaining: ${remainingTime / 1000} seconds`) // Countdown
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
    remainingTime -= 1000
  }

  console.log('Sleep completed!')
}

async function waitForVideoEnd(page: Page): Promise<void> {
  const videoSelector = 'video.vjs-tech' // Or a more specific selector if needed

  await page.waitForSelector('video') // Wait for the video element to appear

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const video = await page.$(videoSelector)
    const duration = await page.evaluate((el) => el?.duration || 0, video)
    const currentTime = await page.evaluate((el) => el?.currentTime || 0, video)

    if (Math.abs(currentTime - duration) <= 0.1) {
      // Allow for slight imprecision
      break
    }

    await new Promise((resolve) => setTimeout(resolve, 500)) // Check every 500ms
  }

  console.log('Video finished playing!')
}

export type TAutomateFn = {
  url: string
  courses: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function automate(opts: TAutomateFn, sendFn: (message: any) => void): Promise<void> {
  const browser = await puppeteer.connect({
    browserWSEndpoint: opts.url,
    defaultViewport: null
  })

  const page = await browser.newPage()

  const courses = opts.courses

  for (const course of courses) {
    sendFn(course)

    await page.goto(course, {
      waitUntil: 'load'
    })

    const collapsedElements = await page.$$('.classroom-toc-section__toggle[aria-expanded="false"]')

    for (const element of collapsedElements) {
      try {
        await element.click()
      } catch (error) {
        console.error(`Error clicking element: ${error}`)
        // Handle the error (e.g., continue to the next element)
      }
    }

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.classroom-toc-item__link'), (e) =>
        e.getAttribute('href')
      )
    )

    sendFn(links)

    const transcripts: string[] = []

    const linksLength = links.length

    for (let i = 0; i < linksLength; i++) {
      const link = links[i]
      if (link?.includes('quiz')) {
        continue
      }
      sendFn(link)

      const baseUrl = 'https://www.linkedin.com'
      await page.goto(`${baseUrl}${link}`, {
        waitUntil: 'load'
      })

      // tunggu button transkrip muncul
      await sleep(2000)

      const button = await page.waitForSelector(
        '[data-live-test-classroom-layout-tab="TRANSCRIPT"]'
      )

      await button?.click()

      const text = html2md(
        (await page.evaluate(() => {
          const container = document.querySelector('.classroom-transcript')
          return container?.innerHTML
        })) || '',
        {
          skipTags: ['a']
        }
      )
      await sleep(10000)
      sendFn(text)
      transcripts.push(text)
      await waitForVideoEnd(page)
    }

    const doc = new Document({
      sections: transcripts.map((text) => ({
        properties: {},
        children: [
          new Paragraph({
            text
          })
        ]
      }))
    })

    Packer.toBuffer(doc).then((buffer) => {
      fs.writeFileSync(
        `./document/${course.replace('https://www.linkedin.com/learning/', '')}.docx`,
        buffer
      )
    })

    sendFn('Document Created')
  }
}
