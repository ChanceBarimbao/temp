import {
  AddIcon, Fab, DialogActions
  , Container, Typography, Box, Grid,
  Dialog, DialogContent, DialogContentText,
  TextField, LoadingBar, Button
} from '@mui/material'
import React, { useState, FormEvent } from 'react'
import { publishCommitment } from '../utils/publishCommitment'
import { getWallet } from '../utils/walletSingleton'
const CommitmentForm = () => {
  const [fileURL, setFileURL] = useState<string>('')
  const [hostingTime, setHostingTime] = useState<number>(0)
  const [formOpen, setFormOpen] = useState<boolean>(false)
  const [formLoading, setFormLoading] = useState<boolean>(false)
  // TODO: Add necessary state variables
  const hostingURL = 'https://overlay.babbage.systems'

  // TODO: Implement form submit handler to publish the file hosting commitment

  const openForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const walletClient = await getWallet()
    const address = await walletClient.getPublicKey({ identityKey: true })

    const response: string = await publishCommitment({
      url: fileURL,
      hostingMinutes: hostingTime,
      address: address.publicKey,
      serviceURL: hostingURL
    })

    console.log(response)
  }
  return (
    <Container maxWidth="sm">
      <Box mt={5} p={3} border={1} borderRadius={4} borderColor="grey.300">
        <Typography variant="h4" gutterBottom>
          Create File Storage Commitment
        </Typography>
        {/* TODO: Add form for entering file hosting commitment details */}
        <Fab color='primary' onClick={() => { setFormOpen(true) }}>
          <AddIcon />
        </Fab>
        <Grid>
          <Dialog open={formOpen} onClose={() => { setFormOpen(false) }}>
            <form
              onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                try {
                  await openForm(e);
                } catch (err: unknown) {
                  console.error("Error in form submission:", err);
                }
              }}
            >

            <DialogContent>
              <DialogContentText paragraph>
                Fill out card information for new Card!
              </DialogContentText>
              <TextField
                label='Card Name'
                onChange={(e: { target: { value: React.SetStateAction<string> } }) => { setFileURL(e.target.value) }}
                value={fileURL}
              />
              <TextField
                label='Card Description'
                onChange={(e: { target: { value: React.SetStateAction<string> } }) => { setHostingTime(e.target.value) }}
                value={hostingTime}
              />
            </DialogContent>
            {formLoading
              ? (<LoadingBar />)
              : (
                <DialogActions>
                  <Button onClick={() => { setFormOpen(false) }}>Cancel</Button>
                  <Button type='submit'>OK</Button>
                </DialogActions>
              )
            }
          </form>
        </Dialog>
      </Grid>
    </Box>
    </Container >
  )
}

export default CommitmentForm