const express = require('express')
const User = require('../models/user')
const router = new express.Router()
const auth = require('../middleware/auth')
const multer = require('multer')
const sharp = require('sharp')
const { sendWelcomeEmail, sendCancellationEmail } = require('../emails/account')


router.get('/test', (req, res) => {
    res.send('From a new file')

})


router.post('/users', async (req, res) => {
    const user = new User(req.body)
    try {
        await user.save()
        sendWelcomeEmail(user.email, user.name)
        const token = await user.generateAuthToken()
        res.status(201).send({ user, token })
    }
    catch (e) {
        res.status(400).send(e)
    }


    router.post('/users/login', async (req, res) => {
        try {
            const user = await User.findByCredentials(req.body.email, req.body.password)
            const token = await user.generateAuthToken()
            res.send({ user, token })
        } catch (e) {
            res.status(400).send()
        }
    })

    router.post('/users/logout', auth, async (req, res) => {
        try {
            console.log(req)
            req.user.tokens = req.user.tokens.filter((token) => {
                return token.token !== req.token
            })
            await req.user.save()
            res.send()
        } catch (e) {
            res.status(500).send()

        }
    })


    router.post('/users/logoutAll', auth, async (req, res) => {
        try {
            req.user.tokens = []
            await req.user.save()
            res.send()
        } catch (e) {
            res.status(500).send()
        }
    })

    // user.save().then(() => {
    //     res.status(201).send(user)
    // }).catch((error) => {
    //     res.status(400).send(error)
    // })
})


router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)

    // User.find({}).then((users) => {
    //     res.send(users)
    // }).catch((e) => {
    //     res.status(500).send()

    // })
})


// router.get('/users/:userId', async (req, res) => {
//     const _id = req.params.userId

//     try {
//         const user = await User.findById(_id)
//         if (!user) {
//             return res.status(404).send()
//         }
//         res.send(user)
//     } catch (e) {
//         res.status(500).send(e)

//     }


//     // User.findById(_id).then((user) => {
//     //     if (!user) {
//     //         return res.status(404).send()
//     //     }
//     //     res.send(user)
//     // }).catch((e) => {
//     //     res.status(500).send()
//     // })
// })


router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
    if (!isValidOperation) {
        return res.status(404).send({ error: 'Invalid updates!' })
    }

    try {
        // const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        // if (!user) {
        //     return res.status(400).send()
        // }
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.delete('/users/me', auth, async (req, res) => {
    try {
        // const user = await User.findByIdAndDelete(req.user._id)
        // if (!user) {
        //     return res.status(404).send()
        // }
        sendCancellationEmail(req.user.email, req.user.name)
        await req.user.remove()
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})

const avatar = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
            return cb(new Error('Please upload an image for the avatar'))
        }
        cb(undefined, true)
    }
})
router.post('/users/me/avatar', auth, avatar.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()

    req.user.avatar = buffer
    await req.user.save()
    res.status(200).send()
}, (error, req, res, next) => {
    res.status(400).send({
        error: error.message
    })
})


router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()
    res.status(200).send()
})


router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user || !user.avatar) {
            throw new Error()
        }
        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    } catch (e) {
        res.status(400).send()
    }
})
module.exports = router