const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'creator') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized. Admin access required.'
    });
  }
  next();
};

// Get admin dashboard stats
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    console.log('Fetching dashboard stats...');

    // Get total orders count
    const totalOrders = await Order.countDocuments();
    console.log('Total orders:', totalOrders);

    // Get total revenue (only from paid orders)
    const revenueData = await Order.aggregate([
      { 
        $match: { 
          isPaid: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
    console.log('Total revenue:', totalRevenue);

    // Get total products
    const totalProducts = await Product.countDocuments();
    console.log('Total products:', totalProducts);

    // Get total users
    const totalUsers = await User.countDocuments();
    console.log('Total users:', totalUsers);

    // Get recent orders (last 5)
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('shippingAddress totalAmount orderStatus createdAt isPaid');

    console.log('Recent orders found:', recentOrders.length);

    // Transform orders data
    const transformedOrders = recentOrders.map(order => ({
      id: order._id,
      customer: order.shippingAddress?.name || 'Guest User',
      amount: order.totalAmount || 0,
      status: order.orderStatus || 'processing',
      date: order.createdAt,
      isPaid: order.isPaid || false
    }));

    // Return dashboard data
    res.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          totalRevenue,
          totalProducts,
          totalUsers
        },
        recentOrders: transformedOrders
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
});

module.exports = router; 