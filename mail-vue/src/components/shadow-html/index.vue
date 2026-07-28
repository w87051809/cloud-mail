<template>
  <div class="content-box" ref="contentBox">
    <div v-if="remoteImageCount > 0" class="remote-image-notice">
      <span>已阻止 {{ remoteImageCount }} 张外部图片</span>
      <button type="button" @click="showRemoteImages">显示图片</button>
    </div>
    <div ref="container" class="content-html"></div>
  </div>
</template>

<script setup>
import DOMPurify from 'dompurify'
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  html: {
    type: String,
    required: true
  }
})

const container = ref(null)
const contentBox = ref(null)
const remoteImageCount = ref(0)
let shadowRoot = null

function cleanInlineStyles(document) {
  document.querySelectorAll('[style]').forEach(element => {
    const style = element.getAttribute('style') || ''
    if (/(url\s*\(|expression\s*\(|@import|javascript\s*:|https?\s*:|behavior\s*:|-moz-binding|<\/?style|position\s*:\s*(fixed|sticky)|z-index\s*:)/i.test(style)) {
      element.removeAttribute('style')
    }
  })
}

function blockRemoteImages(document) {
  let count = 0
  document.querySelectorAll('img[src]').forEach(image => {
    const src = (image.getAttribute('src') || '').trim()
    if (/^https?:\/\//i.test(src)) {
      image.setAttribute('data-mail-remote-src', src)
      image.removeAttribute('src')
      count += 1
    }
  })
  return count
}

function sanitizeContent(html) {
  const parser = new DOMParser()
  const document = parser.parseFromString(html || '', 'text/html')
  const newlyBlocked = blockRemoteImages(document)
  cleanInlineStyles(document)

  const cleaned = DOMPurify.sanitize(document.body.innerHTML, {
    FORBID_TAGS: [
      'script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
      'form', 'input', 'button', 'textarea', 'select', 'option', 'base', 'meta',
      'link', 'svg', 'math', 'video', 'audio', 'source', 'track', 'canvas', 'style'
    ],
    FORBID_ATTR: ['srcdoc', 'formaction'],
    ALLOW_DATA_ATTR: true
  })

  return { cleaned, newlyBlocked }
}

function updateContent() {
  if (!shadowRoot) return

  const { cleaned, newlyBlocked } = sanitizeContent(props.html)
  shadowRoot.innerHTML = `
    <style>
      :host {
        all: initial;
        display: block;
        width: 100%;
        min-height: 100%;
        font-family: -apple-system, Inter, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #13181D;
        word-break: break-word;
      }
      h1, h2, h3, h4 { font-size: 18px; font-weight: 700; }
      p { margin: 0; }
      a { color: #0E70DF; text-decoration: none; }
      .shadow-content { background: #FFFFFF; width: fit-content; min-width: 100%; min-height: 100%; }
      img:not(table img) { max-width: 100%; height: auto !important; }
      img[data-mail-remote-src] { display: none !important; }
    </style>
    <div class="shadow-content">${cleaned}</div>
  `

  remoteImageCount.value = shadowRoot.querySelectorAll('img[data-mail-remote-src]').length || newlyBlocked
}

async function showRemoteImages() {
  if (!shadowRoot) return

  shadowRoot.querySelectorAll('img[data-mail-remote-src]').forEach(image => {
    const src = image.getAttribute('data-mail-remote-src')
    if (src && /^https?:\/\//i.test(src)) {
      image.setAttribute('src', src)
      image.removeAttribute('data-mail-remote-src')
    }
  })

  remoteImageCount.value = 0
  await nextTick()
  autoScale()
}

function autoScale() {
  if (!shadowRoot || !contentBox.value) return

  const shadowContent = shadowRoot.querySelector('.shadow-content')
  if (!shadowContent) return

  const parentWidth = contentBox.value.offsetWidth
  const childWidth = shadowContent.scrollWidth
  if (!parentWidth || !childWidth) return

  shadowRoot.host.style.zoom = Math.min(1, parentWidth / childWidth)
}

onMounted(() => {
  shadowRoot = container.value.attachShadow({ mode: 'closed' })
  updateContent()
  autoScale()
})

watch(() => props.html, async () => {
  updateContent()
  await nextTick()
  autoScale()
})
</script>

<style scoped>
.content-box {
  width: 100%;
  min-height: 100%;
}

.content-html {
  width: 100%;
  min-height: 100%;
}

.remote-image-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 8px;
  color: #704600;
  background: #fff7dd;
  border-bottom: 1px solid #f1d38a;
  font-size: 13px;
}

.remote-image-notice button {
  flex: 0 0 auto;
  padding: 4px 10px;
  color: #0b63ce;
  background: #fff;
  border: 1px solid #9dc5f5;
  border-radius: 4px;
  cursor: pointer;
}
</style>
