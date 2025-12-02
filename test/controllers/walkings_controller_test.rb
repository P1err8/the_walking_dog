require "test_helper"

class WalkingsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get walkings_index_url
    assert_response :success
  end

  test "should get new" do
    get walkings_new_url
    assert_response :success
  end

  test "should get show" do
    get walkings_show_url
    assert_response :success
  end
end
