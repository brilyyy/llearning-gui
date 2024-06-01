/** eslint-disable @typescript-eslint/no-unused-vars */
/** eslint-disable prettier/prettier */
// eslint-disable-next-line prettier/prettier
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button, Divider, Flex, Input, List, Progress, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'

function App(): JSX.Element {
  const [url, setUrl] = useState('')
  const [urls, setUrls] = useState<string[]>([])
  const [host, setHost] = useState('')
  const [log, setLog] = useState('')

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

  const handleAddURL = (): void => {
    setUrl('')
    setUrls([...urls, url])
  }

  const handleRemoveItem = (i: number): void => {
    setUrls(urls.filter((_, index) => index !== i))
  }

  const ipcHandleAutomate = (): void =>
    window.api.automateBrowser({
      url: host,
      courses: urls
    })

  useEffect(() => {
    window.electron.ipcRenderer.on('AUTOMATE_MESSAGE', (_, a) => {
      setLog(`${log}\n${a}\n`)
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners('AUTOMATE_MESSAGE')
    }
  }, [log])

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight
    }
  }, [log, textAreaRef])

  return (
    <>
      <Flex gap={'middle'} vertical>
        <Input onChange={(e) => setHost(e.target.value)} value={host} placeholder="Chrome host" />
        <Divider></Divider>
        <Input onChange={(e) => setUrl(e.target.value)} value={url} />
        <Button onClick={handleAddURL}>Tambah URL</Button>
        <List
          dataSource={urls}
          bordered
          renderItem={(item, index) => (
            <List.Item>
              <Flex justify="space-between" style={{ width: '100%' }}>
                <Typography.Text>{item}</Typography.Text>
                <Button onClick={() => handleRemoveItem(index)} danger shape="circle">
                  X
                </Button>
              </Flex>
            </List.Item>
          )}
        />
        <Divider />
        <Button onClick={ipcHandleAutomate}>Launch 🚀</Button>

        <Input.TextArea
          ref={textAreaRef}
          readOnly
          style={{
            height: '400px',
            maxHeight: '400px',
            resize: 'none'
          }}
          value={log}
        />
      </Flex>
    </>
  )
}

export default App
