const mongoose = require("mongoose");
const User = require("../../models/User");
const Follower = require("../../models/Follower");
const Following = require("../../models/Following");

// Helper function to add a user to the following list
const HandleAddFollowing = async (followerid, userid) => {
    try {
        // ✅ Validate IDs
        if (!mongoose.Types.ObjectId.isValid(userid) || !mongoose.Types.ObjectId.isValid(followerid)) {
            return { error: "Invalid User ID or Follower ID" };
        }

        // ✅ Check if both users exist in the User collection
        const userExists = await User.findById(userid);
        const followerExists = await User.findById(followerid);

        if (!userExists || !followerExists) {
            return { error: "User not registered on the platform" };
        }

        // ✅ Check if followerid already has a Following document
        let followerFollowingDoc = await Following.findOne({ userid: followerid });

        // ✅ Check if already following
        if (followerFollowingDoc && followerFollowingDoc.list.some(f => f.followingid.toString() === userid.toString())) {
            return { error: `Already following ${userExists.name}` };
        }

        // ✅ Create new following entry
        const FollowingEntry = {
            followingid: userid,
            image_path: userExists.profileImage || "",
            bio: userExists.bio || "",
            name: userExists.name,
            userid: userExists.userid
        };

        if (!followerFollowingDoc) {
            // ✅ If follower has no Following document, create one
            followerFollowingDoc = new Following({
                userid: followerid,
                list: [FollowingEntry]
            });
        } else {
            // ✅ If document exists, push new following to the list
            followerFollowingDoc.list.push(FollowingEntry);
        }

        // ✅ Save to database
        await followerFollowingDoc.save();

        return {
            message: "Following added successfully",
            data: followerFollowingDoc
        };

    } catch (err) {
        console.error(err.message);
        return { error: "Server error" };
    }
};

// Helper function to remove a user from the following list
const HandleRemoveFollowing = async (followerid, userid) => {
    try {
        // ✅ Validate IDs
        if (!mongoose.Types.ObjectId.isValid(userid) || !mongoose.Types.ObjectId.isValid(followerid)) {
            return { error: "Invalid User ID or Follower ID" };
        }

        // ✅ Find the following document
        const followingDoc = await Following.findOne({ userid: followerid });

        if (!followingDoc) {
            return { error: "Following relationship not found" };
        }

        // ✅ Check if the user is being followed
        const followingIndex = followingDoc.list.findIndex(item =>
            item.followingid.toString() === userid.toString()
        );

        if (followingIndex === -1) {
            return { error: "Not following this user" };
        }

        // ✅ Remove the user from following list
        followingDoc.list.splice(followingIndex, 1);

        // ✅ Save changes or remove document if list is empty
        if (followingDoc.list.length === 0) {
            await Following.findByIdAndDelete(followingDoc._id);
        } else {
            await followingDoc.save();
        }

        return { message: "Successfully unfollowed" };

    } catch (err) {
        console.error(err.message);
        return { error: "Server error" };
    }
};

// Helper function to remove a follower
const HandleRemoveFollower = async (userid, followerid) => {
    try {
        // ✅ Validate IDs
        if (!mongoose.Types.ObjectId.isValid(userid) || !mongoose.Types.ObjectId.isValid(followerid)) {
            return { error: "Invalid User ID or Follower ID" };
        }

        // ✅ Find the follower document
        const followerDoc = await Follower.findOne({ userid });

        if (!followerDoc) {
            return { error: "Follower relationship not found" };
        }

        // ✅ Check if the user is a follower
        const followerIndex = followerDoc.list.findIndex(item =>
            item.followerid.toString() === followerid.toString()
        );

        if (followerIndex === -1) {
            return { error: "User is not a follower" };
        }

        // ✅ Remove the follower from list
        followerDoc.list.splice(followerIndex, 1);

        // ✅ Save changes or remove document if list is empty
        if (followerDoc.list.length === 0) {
            await Follower.findByIdAndDelete(followerDoc._id);
        } else {
            await followerDoc.save();
        }

        return { message: "Follower removed successfully" };

    } catch (err) {
        console.error(err.message);
        return { error: "Server error" };
    }
};

// Main function to add a follower and update following
const HandleAddFollower = async (req, res) => {
    try {
        const { userid } = req.body;
        const followerid = req.user.id

        // ✅ Validate IDs
        if (!mongoose.Types.ObjectId.isValid(userid) || !mongoose.Types.ObjectId.isValid(followerid)) {
            return res.status(400).json({ error: "Invalid User ID or Follower ID" });
        }

        if(userid === followerid){
            return res.status(400).json({ error: "same User Can Not Follow you self" });
        }

        // ✅ Check if both users exist
        const userExists = await User.findById(userid);
        const followerExists = await User.findById(followerid);

        if (!userExists || !followerExists) {
            return res.status(404).json({ error: "User not registered on the platform" });
        }

        // ✅ Check if userid already has a Follower document
        let userFollowerDoc = await Follower.findOne({ userid });

        // ✅ Check if already following
        if (userFollowerDoc && userFollowerDoc.list.some(f => f.followerid.toString() === followerid.toString())) {
            return res.status(400).json({ error: `Follower already follows ${userExists.name}` });
        }

        // ✅ Create new follower entry
        const FollowerEntry = {
            followerid: followerid,
            image_path: followerExists.profileImage,
            bio: followerExists.bio,
            name: followerExists.name,
            userid: followerExists.userid
        };

        if (!userFollowerDoc) {
            userFollowerDoc = new Follower({
                userid: userid,
                list: [FollowerEntry]
            });
        } else {
            userFollowerDoc.list.push(FollowerEntry);
        }

        // ✅ Add to following list
        const followingResult = await HandleAddFollowing(followerid, userid);

        if (followingResult.error && followingResult.error !== `Already following ${userExists.name}`) {
            return res.status(500).json({ error: followingResult.error });
        }

        await userFollowerDoc.save();

        return res.status(200).json({ message: "Follower added successfully", success: true, data: userFollowerDoc });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Server error" });
    }
};

// Main function to handle unfollowing a user
const HandleUnfollow = async (req, res) => {
    try {
        const { userid } = req.body;
        const followerid = req.user.id;

        // ✅ Remove from following list
        const followingResult = await HandleRemoveFollowing(followerid, userid);
        if (followingResult.error) {
            return res.status(400).json({ error: followingResult.error });
        }

        // ✅ Remove from followers list
        const followerResult = await HandleRemoveFollower(userid, followerid);
        if (followerResult.error) {
            return res.status(400).json({ error: followerResult.error });
        }

        return res.status(200).json({ message: "Successfully unfollowed", success: true });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Server error" });
    }
};

const HandleCheckIsFollowed = async (req, res) => {
    try {
        const userid = req.user.id;
        const followerid = req.params.userid; 
        console.log(userid, followerid);

        // ✅ Validate IDs
        if (!mongoose.Types.ObjectId.isValid(userid) || !mongoose.Types.ObjectId.isValid(followerid)) {
            return res.status(400).json({ error: "Invalid User ID or Follower ID" });
        }

        // ✅ Check if both users exist
        const userExists = await User.findById(userid);
        const followerExists = await User.findById(followerid);

        if (!userExists || !followerExists) {
            return res.status(404).json({ error: "User not registered on the platform" });
        }

        // Check if userid is in followerid's follower list
        const checkFollow = await Follower.findOne({
            userid: followerid,
            "list.followerid": userid
        });

        if (checkFollow) {
            return res.status(200).json({ isFollower: true });
        } else {
            return res.status(200).json({ isFollower: false });
        }
    }
    catch (err) { // Added the 'err' parameter
        console.error(err.message);
        return res.status(500).json({ error: "Server error" });
    }
};


const HandleGetFollowerAndFollowingList = async (req, res) => {
    try {
        const id = req.params.userid;
        console.log(id)
        if (!id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const followers = await Follower.findOne({ userid: id });
        const following = await Following.findOne({ userid: id });

        const followerList = followers?.list || [];
        const followingList = following?.list || [];

        console.log(followerList, followingList);
        return res.status(200).json({ followerList, followingList });

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Server error" });
    }
};


module.exports = {
    HandleAddFollower,
    HandleUnfollow,
    HandleCheckIsFollowed,
    HandleGetFollowerAndFollowingList
};