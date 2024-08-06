const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./models/user');
const Post = require('./models/post');
const Comment = require('./models/comment');

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
/*mongoose.connect('mongodb://localhost:27017/socialMedia', { useNewUrlParser: true, useUnifiedTopology: true });*/
// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/socialMedia');

// User registration endpoint
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if all required fields are provided
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already in use' });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Respond with the created user
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Friend request endpoints
app.post('/friendRequest/send', async (req, res) => {
  const { fromUserId, toUserId } = req.body;

  // Input validation
  if (!fromUserId || !toUserId) {
    return res.status(400).json({ message: 'Both fromUserId and toUserId are required' });
  }

  try {
    // Update the friend requests
    await User.findByIdAndUpdate(fromUserId, { $push: { friendRequestsSent: toUserId } });
    await User.findByIdAndUpdate(toUserId, { $push: { friendRequestsReceived: fromUserId } });

    res.status(200).json({ message: 'Friend request sent' });
  } catch (error) {
    // Handle errors
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/friendRequest/respond', async (req, res) => {
  const { fromUserId, toUserId, accept } = req.body;
  if (accept) {
    await User.findByIdAndUpdate(fromUserId, { $push: { friends: toUserId } });
    await User.findByIdAndUpdate(toUserId, { $push: { friends: fromUserId } });
  }
  await User.findByIdAndUpdate(fromUserId, { $pull: { friendRequestsReceived: toUserId } });
  await User.findByIdAndUpdate(toUserId, { $pull: { friendRequestsSent: fromUserId } });
  res.status(200).send({ message: `Friend request ${accept ? 'accepted' : 'rejected'}` });
});

// Post and Comment endpoints
app.post('/posts', async (req, res) => {
  const { userId, content } = req.body;
  const post = new Post({ userId, content, timestamp: new Date() });
  await post.save();
  res.status(201).send(post);
});

app.post('/comments', async (req, res) => {
  const { postId, userId, content } = req.body;
  const comment = new Comment({ postId, userId, content, timestamp: new Date() });
  await comment.save();
  res.status(201).send(comment); // Corrected line
});

// Feed endpoint
app.get('/feed', async (req, res) => {
  const { userId } = req.query;
  const user = await User.findById(userId);
  const friends = user.friends;
  const posts = await Post.find({ userId: { $in: friends } }).lean();

  for (let post of posts) {
    post.comments = await Comment.find({ postId: post._id });
  }

  res.status(200).send(posts);
});

// Start the server
app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
